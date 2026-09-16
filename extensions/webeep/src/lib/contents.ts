import { callWs } from "./moodle";
import { htmlToText } from "./html";
import { Lang, resolveMlang } from "./mlang";

export interface RawFile {
  type: "file" | "url" | string;
  filename: string;
  filepath?: string;
  filesize?: number;
  fileurl?: string;
  mimetype?: string;
  timemodified?: number;
}

export interface RawModule {
  id: number;
  name: string;
  modname: string;
  url?: string;
  description?: string;
  visible?: number;
  uservisible?: boolean;
  contents?: RawFile[];
}

export interface RawSection {
  id: number;
  name: string;
  summary?: string;
  visible?: number;
  uservisible?: boolean;
  modules: RawModule[];
}

export interface CourseModule {
  id: number;
  name: string;
  modname: string;
  url?: string;
  description?: string;
  sectionName: string;
  files: CourseFile[];
  /** External URL for `url` modules. */
  externalUrl?: string;
}

export interface CourseSection {
  id: number;
  name: string;
  modules: CourseModule[];
}

export interface CourseFile {
  /** Stable identifier: module id + file path. */
  id: string;
  name: string;
  /** `webservice/pluginfile.php` URL without token (add it with `withToken`). */
  downloadUrl: string;
  size: number;
  mimetype?: string;
  modified?: Date;
  moduleName: string;
  sectionName: string;
  courseId: number;
}

export type LinkKind = "recording" | "classroom" | "link";

export interface CourseLink {
  id: number;
  name: string;
  url: string;
  kind: LinkKind;
  sectionName: string;
  courseId: number;
}

const RECORDING_NAME_RE = /registrazion|recording|lezioni registrate|recorded/i;
const RECORDING_URL_RE = /getservizio\.xml\?id_servizio=2294|recordings|panopto|kaltura/i;
const CLASSROOM_URL_RE = /webex\.com|zoom\.us|teams\.microsoft\.com|meet\.google\.com/i;
const CLASSROOM_NAME_RE = /aula virtuale|virtual classroom|webex|zoom|teams/i;

export function classifyLink(name: string, url: string): LinkKind {
  if (RECORDING_NAME_RE.test(name) || RECORDING_URL_RE.test(url)) return "recording";
  if (CLASSROOM_URL_RE.test(url) || CLASSROOM_NAME_RE.test(name)) return "classroom";
  return "link";
}

export function toSections(raw: RawSection[], courseId: number, lang: Lang): CourseSection[] {
  return raw
    .filter((section) => section.uservisible !== false)
    .map((section) => {
      const sectionName = htmlToText(resolveMlang(section.name, lang));
      return {
        id: section.id,
        name: sectionName,
        modules: section.modules
          .filter((module) => module.uservisible !== false)
          .map((module) => toModule(module, sectionName, courseId, lang)),
      };
    });
}

function toModule(raw: RawModule, sectionName: string, courseId: number, lang: Lang): CourseModule {
  const name = htmlToText(resolveMlang(raw.name, lang));
  const contents = raw.contents ?? [];
  const externalUrl = raw.modname === "url" ? contents.find((c) => c.type === "url")?.fileurl : undefined;
  const files: CourseFile[] = contents
    .filter((c) => c.type === "file" && c.fileurl && !/\/mod_page\/content\//.test(c.fileurl))
    .map((c) => ({
      id: `${raw.id}:${c.filepath ?? "/"}${c.filename}`,
      name: c.filename,
      downloadUrl: c.fileurl as string,
      size: c.filesize ?? 0,
      mimetype: c.mimetype,
      modified: c.timemodified ? new Date(c.timemodified * 1000) : undefined,
      moduleName: name,
      sectionName,
      courseId,
    }));
  return {
    id: raw.id,
    name,
    modname: raw.modname,
    url: raw.url,
    description: raw.description ? htmlToText(raw.description) : undefined,
    sectionName,
    files,
    externalUrl,
  };
}

export function collectFiles(sections: CourseSection[]): CourseFile[] {
  return sections.flatMap((section) => section.modules.flatMap((module) => module.files));
}

export function collectLinks(sections: CourseSection[], courseId: number): CourseLink[] {
  return sections.flatMap((section) =>
    section.modules
      .filter((module) => module.modname === "url" && module.externalUrl)
      .map((module) => ({
        id: module.id,
        name: module.name,
        url: module.externalUrl as string,
        kind: classifyLink(module.name, module.externalUrl as string),
        sectionName: section.name,
        courseId,
      })),
  );
}

export async function fetchCourseContents(courseId: number, lang: Lang): Promise<CourseSection[]> {
  const raw = await callWs<RawSection[]>("core_course_get_contents", { courseid: courseId });
  return toSections(raw, courseId, lang);
}
