import { environment, getPreferenceValues } from "@raycast/api";
import fs from "node:fs";
import path from "node:path";

export type DocKind = "notes" | "lyrics";
type DocPreferences = {
  notesFolder?: string;
  lyricsFolder?: string;
  notesTemplateFile?: string;
  lyricsTemplateFile?: string;
  strictLineBreaks?: boolean;
};

const DOC_KINDS: DocKind[] = ["notes", "lyrics"];

// 没指定自定义文件夹时，文档存进项目文件夹，用固定名。
const FIXED_FILE_NAME: Record<DocKind, string> = {
  notes: "Notes.md",
  lyrics: "Lyrics.md",
};

// 自定义文件夹相同时，用后缀区分两类，避免互相覆盖。
const COLLISION_SUFFIX: Record<DocKind, string> = {
  notes: " @Notes",
  lyrics: " @Lyrics",
};

/** 已删除项目的遗留文档收进自定义文件夹下的这个子文件夹（名称固定，不随语言变）。 */
export const DELETED_DOCS_FOLDER = "Deleted Projects";

function prefs(): DocPreferences {
  return getPreferenceValues<DocPreferences>();
}

// 记住"上次用过的自定义文件夹"。实测文件夹被改名后，扩展读到的设置值可能变成空（设置页仍显示旧路径），
// 这时分不清"文件夹没了"和"用户没设"，会把笔记悄悄写进项目文件夹。有了这份记录就能识别前者。
type RememberedFolders = Partial<Record<DocKind, string>>;
let rememberedCache: { file: string; data: RememberedFolders } | null = null;

function rememberedFile(): string {
  return path.join(environment.supportPath, "doc-folders.json");
}

function readRemembered(): RememberedFolders {
  const file = rememberedFile();
  if (rememberedCache?.file === file) return rememberedCache.data;
  let data: RememberedFolders = {};
  try {
    data = JSON.parse(fs.readFileSync(file, "utf8")) as RememberedFolders;
  } catch {
    // 没有记录 = 从未用过自定义文件夹。
  }
  rememberedCache = { file, data };
  return data;
}

function rememberFolder(kind: DocKind, folder: string): void {
  const current = readRemembered();
  if ((current[kind] ?? "") === folder) return;
  const next = { ...current, [kind]: folder };
  rememberedCache = { file: rememberedFile(), data: next };
  try {
    fs.mkdirSync(path.dirname(rememberedCache.file), { recursive: true });
    fs.writeFileSync(rememberedCache.file, JSON.stringify(next));
  } catch {
    // 记不住只是少一层保护，不影响读写。
  }
}

/** 用户确认改为存进项目文件夹：忘掉记住的旧文件夹，解除失效保护。 */
export function forgetDocFolder(kind: DocKind): void {
  rememberFolder(kind, "");
}

// 解析该类文档的文件夹。fromMemory = 设置为空、但用的是记住的旧文件夹（它已不存在）。
function resolveDocFolder(kind: DocKind): { folder: string; fromMemory: boolean } {
  const value = ((kind === "notes" ? prefs().notesFolder : prefs().lyricsFolder) ?? "").trim();
  if (value !== "") {
    if (fs.existsSync(value)) rememberFolder(kind, value);
    return { folder: value, fromMemory: false };
  }
  const remembered = readRemembered()[kind] ?? "";
  if (remembered === "") return { folder: "", fromMemory: false };
  if (fs.existsSync(remembered)) {
    // 旧文件夹还在、设置却清空了：用户是主动改回"存进项目文件夹"。
    forgetDocFolder(kind);
    return { folder: "", fromMemory: false };
  }
  return { folder: remembered, fromMemory: true };
}

// 该类文档的自定义保存文件夹（选填）。留空 = 存进项目文件夹。
// 设置为空、但之前用过的文件夹已消失时，仍返回旧路径，交给 missingDocFolder 判定为失效。
export function getDocFolder(kind: DocKind): string {
  return resolveDocFolder(kind).folder;
}
function getTemplateFile(kind: DocKind): string {
  const value = kind === "notes" ? prefs().notesTemplateFile : prefs().lyricsTemplateFile;
  return (value ?? "").trim();
}

// 规范化路径，用于判断两个自定义文件夹是否指向同一处。
function normalizeFolder(folder: string): string {
  return folder ? path.resolve(folder).replace(/\/+$/, "").toLowerCase() : "";
}

// Notes 与 Lyrics 的自定义文件夹指向同一处时需要加后缀。
function customFoldersCollide(): boolean {
  const notes = normalizeFolder(getDocFolder("notes"));
  const lyrics = normalizeFolder(getDocFolder("lyrics"));
  return notes !== "" && notes === lyrics;
}

// 自定义文件夹设置了但不存在（被改名、移动或外接盘未挂载）时返回该路径，否则返回 null。
export function missingDocFolder(kind: DocKind): string | null {
  const folder = getDocFolder(kind);
  return folder !== "" && !fs.existsSync(folder) ? folder : null;
}

/** 自定义文档文件夹不存在时抛出：此时只读不写，避免在旧路径上悄悄重建文件夹、把笔记拆成两份。 */
export class DocFolderMissingError extends Error {
  constructor(
    readonly folder: string,
    readonly kind: DocKind,
    readonly fromMemory: boolean,
  ) {
    super(`Folder not found: ${folder}`);
    this.name = "DocFolderMissingError";
  }
}

function assertDocFolder(kind: DocKind): void {
  const { folder, fromMemory } = resolveDocFolder(kind);
  if (folder !== "" && !fs.existsSync(folder)) throw new DocFolderMissingError(folder, kind, fromMemory);
}

/** 两个项目的文档会落到同一个文件时抛出（如 Song?A 与 Song？A）：拒绝读写，避免笔记混用。 */
export class DocSharedError extends Error {
  constructor(
    readonly title: string,
    readonly others: string[],
  ) {
    super(`Shares a doc file with: ${others.join(", ")}`);
    this.name = "DocSharedError";
  }
}

// 当前扫描到的项目，以及其中文档会落到同一个文件的分组：`${kind}:${title}` → 其他项目名。
let knownTitles: string[] = [];
let sharedDocs = new Map<string, string[]>();

// 文件夹所在卷是否区分大小写：把文件夹名换个大小写再查，找不到或找到的不是同一个 inode = 区分大小写。
// 名字里没有字母、或探测失败时，按不区分处理（宁可多拦也不混用）。结果按文件夹缓存。
const caseSensitivity = new Map<string, boolean>();

function isCaseSensitive(folder: string): boolean {
  const cached = caseSensitivity.get(folder);
  if (cached !== undefined) return cached;

  let result = false;
  const base = path.basename(folder);
  const flippedBase = base.replace(/[a-z]/gi, (c) => (c === c.toLowerCase() ? c.toUpperCase() : c.toLowerCase()));
  if (flippedBase !== base) {
    try {
      const original = fs.statSync(folder);
      try {
        const flipped = fs.statSync(path.join(path.dirname(folder), flippedBase));
        result = !(flipped.ino === original.ino && flipped.dev === original.dev);
      } catch {
        result = true; // 换了大小写就找不到
      }
    } catch {
      result = false; // 文件夹本身读不到：交给失效保护处理
    }
  }
  caseSensitivity.set(folder, result);
  return result;
}

/** 该类文档的自定义文件夹是否在区分大小写的卷上（未设自定义文件夹时为 false）。 */
export function docFolderIsCaseSensitive(kind: DocKind): boolean {
  const folder = getDocFolder(kind);
  return folder !== "" && isCaseSensitive(folder);
}

// 撞名比较用的键：不区分大小写的卷上转小写（Song.md 与 song.md 是同一个文件），区分大小写的卷上原样比较。
function docKey(title: string, kind: DocKind): string {
  const file = docFilePath({ title, folderPath: "" }, kind);
  return docFolderIsCaseSensitive(kind) ? file : file.toLowerCase();
}

/** 每次加载项目列表后调用，预先算好哪些项目会共用文档文件。 */
export function setKnownProjectTitles(titles: string[]): void {
  knownTitles = titles;
  const next = new Map<string, string[]>();
  for (const kind of DOC_KINDS) {
    if (!getDocFolder(kind)) continue;
    const groups = new Map<string, string[]>();
    for (const title of titles) {
      const key = docKey(title, kind);
      groups.set(key, [...(groups.get(key) ?? []), title]);
    }
    for (const group of groups.values()) {
      if (group.length < 2) continue;
      // 原名即文件名的项目是这个文件的正主：只有一个正主时它照常读写，只拦经替换后撞上的项目；
      // 没有正主或有多个（如只差大小写）时分不清，全部拦下。
      const owners = group.filter(isDocOwner);
      const blocked = owners.length === 1 ? group.filter((title) => title !== owners[0]) : group;
      for (const title of blocked) {
        next.set(
          `${kind}:${title}`,
          group.filter((other) => other !== title),
        );
      }
    }
  }
  sharedDocs = next;
}

/** 与该项目共用某类文档文件的其他项目；没有则为空。 */
export function docSharedWith(title: string, kind: DocKind): string[] {
  return sharedDocs.get(`${kind}:${title}`) ?? [];
}

/** 改名预检：改成 newTitle 后，会与哪些其他项目共用文档文件。 */
export function docNameTakenBy(newTitle: string, selfTitle: string): string[] {
  const others = new Set<string>();
  for (const kind of DOC_KINDS) {
    if (!getDocFolder(kind)) continue;
    const key = docKey(newTitle, kind);
    for (const title of knownTitles) {
      if (title !== selfTitle && docKey(title, kind) === key) others.add(title);
    }
  }
  return [...others];
}

/** 当前项目列表里，除了 title（及 exclude）之外还有谁用着 title 对应的这类文档文件。
 *  不依赖 title 自身是否还在列表里，所以 Finder 删除/改名后（旧名字已不在列表中）也能正确判断。 */
export function docInUseByOthers(title: string, kind: DocKind, exclude: string[] = []): string[] {
  if (!getDocFolder(kind)) return [];
  const key = docKey(title, kind);
  return knownTitles.filter((other) => other !== title && !exclude.includes(other) && docKey(other, kind) === key);
}

/** 名字原样就是文件名（不含需要替换的字符）的项目，是该文件的正主。 */
function isDocOwner(title: string): boolean {
  return docFileBaseName(title) === title;
}

/** 归档/改名迁移前判断：title 对应的文件是否归别的项目。
 *  只有 title 自己是正主、而其他用着它的项目都不是正主时，文件才算 title 的；其余情况（含分不清）一律不动。 */
export function docHeldByOthers(title: string, kind: DocKind, exclude: string[] = []): boolean {
  const others = docInUseByOthers(title, kind, exclude);
  if (others.length === 0) return false;
  return !(isDocOwner(title) && !others.some(isDocOwner));
}

// 写入前的检查：文件夹可用，且不与别的项目共用文件。
function assertDocWritable(title: string, kind: DocKind): void {
  assertDocFolder(kind);
  const others = docSharedWith(title, kind);
  if (others.length > 0) throw new DocSharedError(title, others);
}

// 文件名里的非法字符（含 Windows 非法字符与 Obsidian 禁用的 # ^ [ ] |）。保留 @。
const ILLEGAL_FILE_CHARS = /[/\\:*?"<>|#^[\]]/g;

// 每个非法字符映射到外观相近的全角字符。一一对应，所以 Song?A 与 Song-A 不会落到同一个文件。
const FULLWIDTH: Record<string, string> = {
  "/": "／",
  "\\": "＼",
  ":": "：",
  "*": "＊",
  "?": "？",
  '"': "＂",
  "<": "＜",
  ">": "＞",
  "|": "｜",
  "#": "＃",
  "^": "＾",
  "[": "［",
  "]": "］",
};

/** 项目名 → 文档文件的基础名（不含类型后缀与扩展名）。 */
export function docFileBaseName(title: string): string {
  // 不 trim：首尾空格也是文件夹名的一部分，否则 "Song" 与 " Song " 会撞到同一个文件。
  return title.replace(ILLEGAL_FILE_CHARS, (char) => FULLWIDTH[char] ?? char);
}

// 设了自定义文档文件夹时，返回名字里会被替换掉的字符（去重），供表单提示；否则返回空。
export function alteredDocChars(title: string): string[] {
  if (!getDocFolder("notes") && !getDocFolder("lyrics")) return [];
  return [...new Set(title.match(ILLEGAL_FILE_CHARS) ?? [])];
}

// 解析某项目某类文档的目标 .md 路径，遵循三条命名规则。
export function docFilePath(project: { title: string; folderPath: string }, kind: DocKind): string {
  const folder = getDocFolder(kind);
  if (!folder) {
    // 规则 1：项目文件夹 + 固定名。
    return path.join(project.folderPath, FIXED_FILE_NAME[kind]);
  }
  const base = docFileBaseName(project.title);
  // 规则 3：相同文件夹 → 带类型后缀；规则 2：不同文件夹 → 纯项目名。
  const fileName = customFoldersCollide() ? `${base}${COLLISION_SUFFIX[kind]}.md` : `${base}.md`;
  return path.join(folder, fileName);
}

/** 设了模板文件却读不到时返回它的路径（新建的文档会是空白）；没设或能读到返回 null。 */
export function unreadableTemplate(kind: DocKind): string | null {
  const file = getTemplateFile(kind);
  if (!file) return null;
  try {
    fs.accessSync(file, fs.constants.R_OK);
    return null;
  } catch {
    return file;
  }
}

// 日期格式记号，与 Obsidian（Moment.js）一致；长的写在前面，避免 MMMM 被拆成 MM + MM。[文字] 原样输出。
const DATE_TOKENS = /\[([^\]]*)]|YYYY|YY|MMMM|MMM|MM|M|DD|D|dddd|ddd|HH|mm/g;

/** 按格式把日期格式化成文字（本地时区）。不认识的字符原样保留。 */
export function formatDate(date: Date, format: string): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return format.replace(DATE_TOKENS, (token: string, literal: string | undefined) => {
    if (literal !== undefined) return literal;
    switch (token) {
      case "YYYY":
        return String(date.getFullYear());
      case "YY":
        return pad(date.getFullYear() % 100);
      case "MMMM":
        return date.toLocaleString("en-US", { month: "long" });
      case "MMM":
        return date.toLocaleString("en-US", { month: "short" });
      case "MM":
        return pad(date.getMonth() + 1);
      case "M":
        return String(date.getMonth() + 1);
      case "DD":
        return pad(date.getDate());
      case "D":
        return String(date.getDate());
      case "dddd":
        return date.toLocaleString("en-US", { weekday: "long" });
      case "ddd":
        return date.toLocaleString("en-US", { weekday: "short" });
      case "HH":
        return pad(date.getHours());
      case "mm":
        return pad(date.getMinutes());
      default:
        return token;
    }
  });
}

// 占位符：{{title}}、{{date}}、{{time}}，后两个可带格式，如 {{date:YYYY/MM/DD}}、{{time:HH.mm}}。
const PLACEHOLDER = /\{\{(title|date|time)(?::([^}]*))?\}\}/g;
const DEFAULT_FORMAT = { date: "YYYY-MM-DD", time: "HH:mm" } as const;

// 替换模板占位符。一次扫描替换全部：标题里若恰好含 {{date}}，不会被二次替换。
// 用函数形式替换：字符串形式会把标题里的 $&、$$ 等当成替换模式（如 “Money $$” 会变成 “Money $”）。
export function renderTemplate(template: string, project: { title: string }, now = new Date()): string {
  return template.replace(PLACEHOLDER, (_match, name: "title" | "date" | "time", format: string | undefined) => {
    if (name === "title") return project.title;
    return formatDate(now, format || DEFAULT_FORMAT[name]);
  });
}

const FRONTMATTER = /^\uFEFF?---\r?\n[\s\S]*?\r?\n---\r?\n?/;

/** 内容为空（只有空白字符或 BOM）的文档视同新建：套用模板。 */
export function isBlankDoc(content: string): boolean {
  return content.replace(/^\uFEFF/, "").trim() === "";
}

// 新建文件的初始内容：有模板文件就套模板，否则空。Edit Note 新建笔记时也用它预填正文。
export function initialContent(project: { title: string }, kind: DocKind): string {
  const templateFile = getTemplateFile(kind);
  if (templateFile) {
    try {
      return renderTemplate(fs.readFileSync(templateFile, "utf8"), project);
    } catch {
      // 模板读取失败则退回空内容。
    }
  }
  return "";
}

// 去掉开头的 YAML frontmatter，用于在 Detail 里只渲染正文。
export function stripFrontmatter(markdown: string): string {
  return markdown.replace(/^\uFEFF?---\r?\n[\s\S]*?\r?\n---\r?\n?/, "");
}

const FENCE = /^\s*(```|~~~)/;

// 把单个换行转成 Markdown 硬换行（行尾两个空格）。空行、代码块内部、代码块前一行不动。
export function softBreaksToHard(markdown: string): string {
  const lines = markdown.split(/\r?\n/);
  let inFence = false;
  return lines
    .map((line, i) => {
      if (FENCE.test(line)) {
        inFence = !inFence;
        return line;
      }
      const next = lines[i + 1];
      if (inFence || next === undefined || line.trim() === "" || next.trim() === "" || FENCE.test(next)) {
        return line;
      }
      return /( {2}|\\)$/.test(line) ? line : `${line}  `;
    })
    .join("\n");
}

// 显示用：默认模拟 Obsidian（单个换行即换行）；开启 Strict Line Breaks 则按标准 Markdown 原样渲染。
// 只影响显示，不改文件。
export function displayDoc(markdown: string): string {
  return prefs().strictLineBreaks ? markdown : softBreaksToHard(markdown);
}

// 文件是否已存在。
export function docFileExists(project: { title: string; folderPath: string }, kind: DocKind): boolean {
  return fs.existsSync(docFilePath(project, kind));
}

// 读取原始内容（不存在返回空）。
export function readDocFile(project: { title: string; folderPath: string }, kind: DocKind): string {
  if (docSharedWith(project.title, kind).length > 0) return "";
  try {
    return fs.readFileSync(docFilePath(project, kind), "utf8");
  } catch {
    return "";
  }
}

/** 文件存在但读不出来时抛出（权限不够、iCloud 文件还没下载到本地等）。 */
export class DocUnreadableError extends Error {
  constructor(readonly file: string) {
    super(`Couldn't read: ${file}`);
    this.name = "DocUnreadableError";
  }
}

// 编辑前读取：和 readDocFile 不同，要区分「文件不存在」（返回空，可以新建）和「存在但读不出来」（抛错）。
// 后者若也当成空，编辑表单会以空白打开，一保存就覆盖原文。
export function readDocFileForEdit(project: { title: string; folderPath: string }, kind: DocKind): string {
  if (docSharedWith(project.title, kind).length > 0) return "";
  const file = docFilePath(project, kind);
  try {
    return fs.readFileSync(file, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === "ENOENT") return "";
    throw new DocUnreadableError(file);
  }
}

/** 文档文件当前的修改时间（不存在为 null）。编辑前记下、保存前比对，用来发现外部改动。 */
export function docFileMtime(project: { title: string; folderPath: string }, kind: DocKind): number | null {
  try {
    return fs.statSync(docFilePath(project, kind)).mtimeMs;
  } catch {
    return null;
  }
}

// 确保文件存在（不存在就按模板创建），返回路径。供 Open 使用。自定义文件夹失效时抛 DocFolderMissingError。
export function ensureDocFile(project: { title: string; folderPath: string }, kind: DocKind): string {
  assertDocWritable(project.title, kind);
  const file = docFilePath(project, kind);
  if (!fs.existsSync(file)) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, initialContent(project, kind), "utf8");
  } else if (fileIsBlank(file)) {
    // 已存在但是空文件：同样套模板。没模板时不写，免得白白改动修改时间。
    const content = initialContent(project, kind);
    if (content) fs.writeFileSync(file, content, "utf8");
  }
  return file;
}

// 读得出来且内容为空才算空；读不出来的文件不碰。
function fileIsBlank(file: string): boolean {
  try {
    return isBlankDoc(fs.readFileSync(file, "utf8"));
  } catch {
    return false;
  }
}

// 写入正文，但保留文件原有的 frontmatter（编辑笔记时用）。自定义文件夹失效时抛 DocFolderMissingError。
export function writeDocBody(project: { title: string; folderPath: string }, kind: DocKind, body: string): void {
  assertDocWritable(project.title, kind);
  const file = docFilePath(project, kind);
  let existing = "";
  try {
    existing = fs.readFileSync(file, "utf8");
  } catch {
    // 文件不存在 = 没有 frontmatter 可保留。
  }
  // 新建或空文件：frontmatter 取自模板；否则保留文件原有的。
  const source = isBlankDoc(existing) ? initialContent(project, kind) : existing;
  const match = source.match(FRONTMATTER);
  const frontmatter = match ? match[0] : "";
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, frontmatter + body, "utf8");
}

// 两个路径是否指向同一个文件（比较 inode + 设备号）。只改大小写时，在不区分大小写的卷上为 true；
// 在区分大小写的卷上，目标若是另一份独立文档则为 false，绝不能覆盖。任一路径不存在时为 false。
function sameFile(a: string, b: string): boolean {
  try {
    const sa = fs.statSync(a);
    const sb = fs.statSync(b);
    return sa.ino === sb.ino && sa.dev === sb.dev;
  } catch {
    return false;
  }
}

// 改名前预检：哪些文档的目标文件已被占用（只改大小写不算）。返回被占用的文件名，供确认框提示。
export function docRenameConflicts(oldTitle: string, newTitle: string): string[] {
  const files: string[] = [];
  for (const kind of DOC_KINDS) {
    if (!getDocFolder(kind)) continue;
    const oldPath = docFilePath({ title: oldTitle, folderPath: "" }, kind);
    const newPath = docFilePath({ title: newTitle, folderPath: "" }, kind);
    if (fs.existsSync(newPath) && !sameFile(oldPath, newPath)) files.push(path.basename(newPath));
  }
  return files;
}

export type DocRenameResult = { conflicts: DocKind[]; failures: DocKind[] };

// 项目改名时，把自定义文件夹里的文档文件一并改名；默认存项目文件夹的随文件夹改名，无需处理。
// 用 link + unlink 做"原子不覆盖"改名：目标已存在时绝不覆盖（抛 EEXIST），避免丢失他人文档。
// 返回每类文档的冲突/失败，交由调用方如实提示用户。
export function renameDocFiles(oldTitle: string, newTitle: string): DocRenameResult {
  const result: DocRenameResult = { conflicts: [], failures: [] };
  if (oldTitle === newTitle) return result;

  DOC_KINDS.forEach((kind) => {
    if (!getDocFolder(kind)) return;
    // 排除 newTitle：改成与旧名对应同一文件的名字（如 Song?A → Song？A）时，那是它自己，不算别人。
    if (docHeldByOthers(oldTitle, kind, [newTitle])) {
      // 这份文件还被别的项目用着，不能跟着这个项目改名。
      // 不能只查撞名表：Finder 改名后旧名字已不在当前列表里，表里查不到它。
      result.conflicts.push(kind);
      return;
    }
    const oldPath = docFilePath({ title: oldTitle, folderPath: "" }, kind);
    const newPath = docFilePath({ title: newTitle, folderPath: "" }, kind);
    if (!fs.existsSync(oldPath)) return; // 没有源文件，无需改名

    if (sameFile(oldPath, newPath)) {
      // 目标就是源文件本身（只改大小写）：直接 rename（link 会因"目标已存在"失败）。
      try {
        fs.renameSync(oldPath, newPath);
      } catch {
        result.failures.push(kind);
      }
      return;
    }

    try {
      fs.linkSync(oldPath, newPath); // 原子不覆盖：目标存在则抛 EEXIST
    } catch (error) {
      if ((error as NodeJS.ErrnoException)?.code === "EEXIST") {
        result.conflicts.push(kind);
      } else {
        result.failures.push(kind);
      }
      return;
    }

    try {
      fs.unlinkSync(oldPath); // 删除旧链接，完成改名
    } catch {
      // 新文件已就位、旧文件删除失败：内容未丢，留下旧副本即可。
    }
  });

  return result;
}

/** 已归档文档：relativePath 相对于该类文档的自定义文件夹，整个文件夹被搬走后仍能找回。 */
export type ArchivedDoc = { kind: DocKind; relativePath: string };

// 项目删除时，把自定义文件夹里的文档移进 Deleted Projects/。同名时依次用 "名 2"、"名 3"…，绝不覆盖。
export function archiveDocFiles(title: string): ArchivedDoc[] {
  const archived: ArchivedDoc[] = [];
  for (const kind of DOC_KINDS) {
    const folder = getDocFolder(kind);
    if (!folder || !fs.existsSync(folder)) continue;
    const source = docFilePath({ title, folderPath: "" }, kind);
    if (!fs.existsSync(source)) continue;
    // 不能只查撞名表：Finder 删除后该项目已不在当前列表里。直接问"还有没有别的项目用着这个文件"。
    if (docHeldByOthers(title, kind)) continue;

    try {
      const dir = path.join(folder, DELETED_DOCS_FOLDER);
      fs.mkdirSync(dir, { recursive: true });
      const ext = path.extname(source);
      const base = path.basename(source, ext);

      for (let n = 1; n <= 1000; n++) {
        const name = n === 1 ? `${base}${ext}` : `${base} ${n}${ext}`;
        try {
          fs.linkSync(source, path.join(dir, name));
        } catch (error) {
          if ((error as NodeJS.ErrnoException)?.code === "EEXIST") continue;
          break;
        }
        try {
          fs.unlinkSync(source);
        } catch {
          // 旧文件删除失败：归档副本已就位，内容未丢。
        }
        archived.push({ kind, relativePath: path.join(DELETED_DOCS_FOLDER, name) });
        break;
      }
    } catch {
      // 归档失败（如文件夹不可写）：文档留在原处，不影响删除项目。
    }
  }
  return archived;
}

// 项目从废纸篓放回后，把归档的文档移回原位。原位置已被占用时不覆盖，保留归档。
// unavailable = 文档文件夹暂时不可用（外接盘未挂载、文件夹失效等），值得下次重试；
// gone = 文件夹在、但归档文件已不在（如被手动删除），不必再试。
export function restoreArchivedDoc(
  project: { title: string; folderPath: string },
  doc: ArchivedDoc,
): "restored" | "conflict" | "unavailable" | "gone" {
  const folder = getDocFolder(doc.kind);
  if (!folder || !fs.existsSync(folder)) return "unavailable";
  const source = path.join(folder, doc.relativePath);
  if (!fs.existsSync(source)) return "gone";

  try {
    fs.linkSync(source, docFilePath(project, doc.kind));
  } catch (error) {
    return (error as NodeJS.ErrnoException)?.code === "EEXIST" ? "conflict" : "unavailable";
  }
  try {
    fs.unlinkSync(source);
  } catch {
    // 已还原；归档副本删不掉就留着。
  }
  return "restored";
}
