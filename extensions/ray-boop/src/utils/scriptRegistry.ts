// Script registry that imports all Boop scripts directly as ES modules
// This provides access to all scripts with proper metadata and icons

interface ScriptMetadata {
  name: string;
  description: string;
  author: string;
  icon: string;
  tags: string;
  category: string;
  api?: number;
  bias?: number;
}

interface BoopScript {
  metadata: ScriptMetadata;
  main: (state: { text: string; postError: (message: string) => void; postInfo: (message: string) => void }) => void;
}

// Import all scripts
import * as AddSlashes from "../scripts/AddSlashes.js";
import * as AndroidIOSStrings from "../scripts/AndroidIOSStrings.js";
import * as ASCIIToHex from "../scripts/ASCIIToHex.js";
import * as Base64Decode from "../scripts/Base64Decode.js";
import * as Base64Encode from "../scripts/Base64Encode.js";
import * as BinaryToDecimal from "../scripts/BinaryToDecimal.js";
import * as CalculateSize from "../scripts/CalculateSize.js";
import * as CamelCase from "../scripts/CamelCase.js";
import * as Collapse from "../scripts/Collapse.js";
import * as contrastingColor from "../scripts/contrastingColor.js";
import * as convertToMarkdownTable from "../scripts/convertToMarkdownTable.js";
import * as CountCharacters from "../scripts/CountCharacters.js";
import * as CountLines from "../scripts/CountLines.js";
import * as CountWords from "../scripts/CountWords.js";
import * as CreateProjectGlossaryMarkdown from "../scripts/CreateProjectGlossaryMarkdown.js";
import * as CSVtoJSON from "../scripts/CSVtoJSON.js";
import * as CSVtoJSONheaderless from "../scripts/CSVtoJSONheaderless.js";
import * as DateToTimestamp from "../scripts/DateToTimestamp.js";
import * as DateToUTC from "../scripts/DateToUTC.js";
import * as Deburr from "../scripts/Deburr.js";
import * as DecimalToBinary from "../scripts/DecimalToBinary.js";
import * as DecimalToHex from "../scripts/DecimalToHex.js";
import * as DIGI2ASCII from "../scripts/DIGI2ASCII.js";
import * as Downcase from "../scripts/Downcase.js";
import * as EvalJavascript from "../scripts/EvalJavascript.js";
import * as FishHexPathConverter from "../scripts/FishHexPathConverter.js";
import * as FormatCSS from "../scripts/FormatCSS.js";
import * as FormatJSON from "../scripts/FormatJSON.js";
import * as FormatSQL from "../scripts/FormatSQL.js";
import * as FormatXML from "../scripts/FormatXML.js";
import * as FromUnicode from "../scripts/FromUnicode.js";
import * as generateHashtag from "../scripts/generateHashtag.js";
import * as hex2rgb from "../scripts/hex2rgb.js";
import * as HexToASCII from "../scripts/HexToASCII.js";
import * as HexToDecimal from "../scripts/HexToDecimal.js";
import * as HTMLDecode from "../scripts/HTMLDecode.js";
import * as HTMLEncode from "../scripts/HTMLEncode.js";
import * as HTMLEncodeAll from "../scripts/HTMLEncodeAll.js";
import * as IOSAndroidStrings from "../scripts/IOSAndroidStrings.js";
import * as JoinLines from "../scripts/JoinLines.js";
import * as JoinLinesWithComma from "../scripts/JoinLinesWithComma.js";
import * as JoinLinesWithSpace from "../scripts/JoinLinesWithSpace.js";
import * as JsObjectToJSON from "../scripts/JsObjectToJSON.js";
import * as JSONtoCSV from "../scripts/JSONtoCSV.js";
import * as JsonToQuery from "../scripts/JsonToQuery.js";
import * as JSONtoYAML from "../scripts/JSONtoYAML.js";
import * as jsToPhp from "../scripts/jsToPhp.js";
import * as JWTDecode from "../scripts/JWTDecode.js";
import * as KebabCase from "../scripts/KebabCase.js";
import * as LineComparer from "../scripts/LineComparer.js";
import * as listToHTMLList from "../scripts/listToHTMLList.js";
import * as LoremIpsum from "../scripts/LoremIpsum.js";
import * as MarkdownQuote from "../scripts/MarkdownQuote.js";
import * as MD5 from "../scripts/MD5.js";
import * as MinifyCSS from "../scripts/MinifyCSS.js";
import * as MinifyJSON from "../scripts/MinifyJSON.js";
import * as MinifySQL from "../scripts/MinifySQL.js";
import * as MinifyXML from "../scripts/MinifyXML.js";
import * as NatSort from "../scripts/NatSort.js";
import * as NormalizeToNFC from "../scripts/NormalizeToNFC.js";
import * as NormalizeToNFD from "../scripts/NormalizeToNFD.js";
import * as NormalizeToNFKC from "../scripts/NormalizeToNFKC.js";
import * as NormalizeToNFKD from "../scripts/NormalizeToNFKD.js";
import * as PhpUnserialize from "../scripts/PhpUnserialize.js";
import * as QueryToJson from "../scripts/QueryToJson.js";
import * as RemoveDuplicates from "../scripts/RemoveDuplicates.js";
import * as RemoveSlashes from "../scripts/RemoveSlashes.js";
import * as ReplaceSmartQuotes from "../scripts/ReplaceSmartQuotes.js";
import * as ReverseLines from "../scripts/ReverseLines.js";
import * as ReverseString from "../scripts/ReverseString.js";
import * as rgb2hex from "../scripts/rgb2hex.js";
import * as Rot13 from "../scripts/Rot13.js";
import * as SHA1 from "../scripts/SHA1.js";
import * as SHA256 from "../scripts/SHA256.js";
import * as SHA512 from "../scripts/SHA512.js";
import * as ShuffleCharacters from "../scripts/ShuffleCharacters.js";
import * as ShuffleLines from "../scripts/ShuffleLines.js";
import * as SnakeCase from "../scripts/SnakeCase.js";
import * as Sort from "../scripts/Sort.js";
import * as SortJSON from "../scripts/SortJSON.js";
import * as SpongeCase from "../scripts/SpongeCase.js";
import * as StartCase from "../scripts/StartCase.js";
import * as SumAll from "../scripts/SumAll.js";
import * as TimeToSecond from "../scripts/TimeToSecond.js";
import * as toggleCamelHyphen from "../scripts/toggleCamelHyphen.js";
import * as toUnicode from "../scripts/toUnicode.js";
import * as Trim from "../scripts/Trim.js";
import * as TrimEnd from "../scripts/TrimEnd.js";
import * as TrimStart from "../scripts/TrimStart.js";
import * as tsvToJson from "../scripts/tsvToJson.js";
import * as Upcase from "../scripts/Upcase.js";
import * as URLDecode from "../scripts/URLDecode.js";
import * as URLDefang from "../scripts/URLDefang.js";
import * as URLEncode from "../scripts/URLEncode.js";
import * as URLEntitiesDecode from "../scripts/URLEntitiesDecode.js";
import * as URLEntitiesEncode from "../scripts/URLEntitiesEncode.js";
import * as URLRefang from "../scripts/URLRefang.js";
import * as Wadsworth from "../scripts/Wadsworth.js";
import * as WkbToWkt from "../scripts/WkbToWkt.js";
import * as WktToWkb from "../scripts/WktToWkb.js";
import * as YAMLtoJSON from "../scripts/YAMLtoJSON.js";

// Interface for script modules
interface ScriptModule {
  main: (state: { text: string; postError: (message: string) => void; postInfo: (message: string) => void }) => void;
  [key: string]: unknown;
}

// Helper function to create script metadata
function createScript(
  scriptModule: ScriptModule,
  name: string,
  description: string,
  icon: string,
  tags: string,
  category: string,
  bias?: number,
): BoopScript {
  return {
    metadata: {
      name,
      description,
      author: "Boop Community",
      icon,
      tags,
      category,
      bias,
    },
    main: scriptModule.main,
  };
}

// Registry of all scripts with metadata
export const scripts: Record<string, BoopScript> = {
  // Text Case Operations
  camelCase: createScript(
    CamelCase,
    "Camel Case",
    "convertsYourTextToCamelCase",
    "🐫",
    "camel,case,function,lodash",
    "text-case",
  ),
  kebabCase: createScript(
    KebabCase,
    "Kebab Case",
    "converts-your-text-to-kebab-case",
    "🔗",
    "kebab,case,function,lodash",
    "text-case",
  ),
  snakeCase: createScript(
    SnakeCase,
    "Snake Case",
    "converts_your_text_to_snake_case",
    "🐍",
    "snake,case,function,lodash",
    "text-case",
  ),
  startCase: createScript(
    StartCase,
    "Start Case",
    "Converts Your Text To Start Case",
    "🎯",
    "start,case,title,function,lodash",
    "text-case",
  ),
  spongeCase: createScript(
    SpongeCase,
    "Sponge Case",
    "cOnVeRtS yOuR tExT tO sPoNgE cAsE",
    "🧽",
    "sponge,case,random,mocking",
    "text-case",
  ),
  upcase: createScript(
    Upcase,
    "Uppercase",
    "CONVERTS YOUR TEXT TO UPPERCASE",
    "⬆️",
    "uppercase,caps,case",
    "text-case",
  ),
  downcase: createScript(Downcase, "Lowercase", "converts your text to lowercase", "⬇️", "lowercase,case", "text-case"),
  toggleCamelHyphen: createScript(
    toggleCamelHyphen,
    "Toggle Camel/Hyphen",
    "Toggles between camelCase and hyphen-case",
    "🔄",
    "toggle,camel,hyphen,case",
    "text-case",
  ),

  // Encoding/Decoding
  base64Encode: createScript(
    Base64Encode,
    "Base64 Encode",
    "Encodes your text to Base64",
    "🔒",
    "base64,encode",
    "encoding",
  ),
  base64Decode: createScript(
    Base64Decode,
    "Base64 Decode",
    "Decodes your text from Base64",
    "🔓",
    "base64,decode",
    "encoding",
  ),
  urlEncode: createScript(
    URLEncode,
    "URL Encode",
    "Encodes your text for URLs",
    "🌐",
    "url,encode,percent",
    "encoding",
  ),
  urlDecode: createScript(URLDecode, "URL Decode", "Decodes URL encoded text", "🌐", "url,decode,percent", "encoding"),
  htmlEncode: createScript(
    HTMLEncode,
    "HTML Encode",
    "Encodes HTML entities",
    "📝",
    "html,encode,entities",
    "encoding",
  ),
  htmlDecode: createScript(
    HTMLDecode,
    "HTML Decode",
    "Decodes HTML entities",
    "📝",
    "html,decode,entities",
    "encoding",
  ),
  htmlEncodeAll: createScript(
    HTMLEncodeAll,
    "HTML Encode All",
    "Encodes all characters as HTML entities",
    "📝",
    "html,encode,entities,all",
    "encoding",
  ),
  urlEntitiesEncode: createScript(
    URLEntitiesEncode,
    "URL Entities Encode",
    "Encodes URL entities",
    "🌐",
    "url,entities,encode",
    "encoding",
  ),
  urlEntitiesDecode: createScript(
    URLEntitiesDecode,
    "URL Entities Decode",
    "Decodes URL entities",
    "🌐",
    "url,entities,decode",
    "encoding",
  ),

  // Hash/Crypto
  md5: createScript(MD5, "MD5 Checksum", "Computes the MD5 checksum of your text", "🔐", "md5,hash,checksum", "crypto"),
  sha1: createScript(
    SHA1,
    "SHA1 Checksum",
    "Computes the SHA1 checksum of your text",
    "🔑",
    "sha1,hash,checksum",
    "crypto",
  ),
  sha256: createScript(
    SHA256,
    "SHA256 Checksum",
    "Computes the SHA256 checksum of your text",
    "🛡️",
    "sha256,hash,checksum",
    "crypto",
  ),
  sha512: createScript(
    SHA512,
    "SHA512 Checksum",
    "Computes the SHA512 checksum of your text",
    "🔒",
    "sha512,hash,checksum",
    "crypto",
  ),
  rot13: createScript(Rot13, "ROT13", "Applies ROT13 cipher to your text", "🔄", "rot13,cipher,encode", "crypto"),
  jwtDecode: createScript(JWTDecode, "JWT Decode", "Decodes JSON Web Tokens", "🗝️", "jwt,token,decode,json", "crypto"),

  // Formatting
  formatJSON: createScript(
    FormatJSON,
    "Format JSON",
    "Cleans and formats JSON documents",
    "✨",
    "json,prettify,clean,indent",
    "formatting",
  ),
  formatXML: createScript(FormatXML, "Format XML", "Formats XML documents", "📄", "xml,format,prettify", "formatting"),
  formatCSS: createScript(
    FormatCSS,
    "Format CSS",
    "Formats CSS stylesheets",
    "🎨",
    "css,format,prettify",
    "formatting",
  ),
  formatSQL: createScript(FormatSQL, "Format SQL", "Formats SQL queries", "🗄️", "sql,format,prettify", "formatting"),
  minifyJSON: createScript(
    MinifyJSON,
    "Minify JSON",
    "Minifies JSON by removing whitespace",
    "📦",
    "json,minify,compress",
    "formatting",
  ),
  minifyXML: createScript(
    MinifyXML,
    "Minify XML",
    "Minifies XML by removing whitespace",
    "📦",
    "xml,minify,compress",
    "formatting",
  ),
  minifyCSS: createScript(
    MinifyCSS,
    "Minify CSS",
    "Minifies CSS by removing whitespace",
    "📦",
    "css,minify,compress",
    "formatting",
  ),
  minifySQL: createScript(
    MinifySQL,
    "Minify SQL",
    "Minifies SQL by removing whitespace",
    "📦",
    "sql,minify,compress",
    "formatting",
  ),
  normalizeToNFC: createScript(
    NormalizeToNFC,
    "Normalize to NFC",
    "Normalizes text to NFC (Normalization Form C)",
    "🔤",
    "normalize,nfc,unicode",
    "formatting",
  ),
  normalizeToNFD: createScript(
    NormalizeToNFD,
    "Normalize to NFD",
    "Normalizes text to NFD (Normalization Form D)",
    "🔤",
    "normalize,nfd,unicode",
    "formatting",
  ),
  normalizeToNFKC: createScript(
    NormalizeToNFKC,
    "Normalize to NFKC",
    "Normalizes text to NFKC (Normalization Form KC)",
    "🔤",
    "normalize,nfkc,unicode",
    "formatting",
  ),
  normalizeToNFKD: createScript(
    NormalizeToNFKD,
    "Normalize to NFKD",
    "Normalizes text to NFKD (Normalization Form KD)",
    "🔤",
    "normalize,nfkd,unicode",
    "formatting",
  ),

  // Data Conversion
  jsonToYaml: createScript(
    JSONtoYAML,
    "JSON to YAML",
    "Converts JSON to YAML format",
    "🔄",
    "json,yaml,convert",
    "conversion",
  ),
  yamlToJson: createScript(
    YAMLtoJSON,
    "YAML to JSON",
    "Converts YAML to JSON format",
    "🔄",
    "yaml,json,convert",
    "conversion",
  ),
  jsonToCSV: createScript(
    JSONtoCSV,
    "JSON to CSV",
    "Converts JSON to CSV format",
    "📊",
    "json,csv,convert",
    "conversion",
  ),
  csvToJson: createScript(
    CSVtoJSON,
    "CSV to JSON",
    "Converts CSV to JSON format",
    "📊",
    "csv,json,convert,table",
    "conversion",
  ),
  csvToJsonHeaderless: createScript(
    CSVtoJSONheaderless,
    "CSV to JSON (Headerless)",
    "Converts headerless CSV to JSON",
    "📊",
    "csv,json,convert,table,headerless",
    "conversion",
  ),
  jsonToQuery: createScript(
    JsonToQuery,
    "JSON to Query String",
    "Converts JSON to URL query string",
    "🌐",
    "json,query,url,convert",
    "conversion",
  ),
  queryToJson: createScript(
    QueryToJson,
    "Query String to JSON",
    "Converts URL query string to JSON",
    "🌐",
    "query,json,url,convert",
    "conversion",
  ),
  jsObjectToJSON: createScript(
    JsObjectToJSON,
    "JS Object to JSON",
    "Converts JavaScript object notation to JSON",
    "📝",
    "javascript,json,object,convert",
    "conversion",
  ),
  jsToPhp: createScript(
    jsToPhp,
    "JS to PHP",
    "Converts JavaScript arrays to PHP arrays",
    "🔄",
    "javascript,php,array,convert",
    "conversion",
  ),
  tsvToJson: createScript(
    tsvToJson,
    "TSV to JSON",
    "Converts Tab-Separated Values to JSON",
    "📊",
    "tsv,json,convert",
    "conversion",
  ),

  // Number Systems
  binaryToDecimal: createScript(
    BinaryToDecimal,
    "Binary to Decimal",
    "Converts binary numbers to decimal",
    "💻",
    "binary,decimal,convert,number",
    "numbers",
  ),
  decimalToBinary: createScript(
    DecimalToBinary,
    "Decimal to Binary",
    "Converts decimal numbers to binary",
    "💻",
    "decimal,binary,convert,number",
    "numbers",
  ),
  decimalToHex: createScript(
    DecimalToHex,
    "Decimal to Hex",
    "Converts decimal numbers to hexadecimal",
    "🔢",
    "decimal,hex,convert,number",
    "numbers",
  ),
  hexToDecimal: createScript(
    HexToDecimal,
    "Hex to Decimal",
    "Converts hexadecimal numbers to decimal",
    "🔢",
    "hex,decimal,convert,number",
    "numbers",
  ),
  asciiToHex: createScript(
    ASCIIToHex,
    "ASCII to Hex",
    "Converts ASCII text to hexadecimal",
    "🔤",
    "ascii,hex,convert",
    "numbers",
  ),
  hexToASCII: createScript(
    HexToASCII,
    "Hex to ASCII",
    "Converts hexadecimal to ASCII text",
    "🔤",
    "hex,ascii,convert",
    "numbers",
  ),
  digiToAscii: createScript(
    DIGI2ASCII,
    "DIGI to ASCII",
    "Converts DIGI format to ASCII",
    "🔤",
    "digi,ascii,convert",
    "numbers",
  ),

  // Colors
  hex2rgb: createScript(hex2rgb, "Hex to RGB", "Converts hex colors to RGB", "🎨", "hex,rgb,color,convert", "colors"),
  rgb2hex: createScript(rgb2hex, "RGB to Hex", "Converts RGB colors to hex", "🎨", "rgb,hex,color,convert", "colors"),
  contrastingColor: createScript(
    contrastingColor,
    "Contrasting Color",
    "Finds contrasting color for given color",
    "🌈",
    "color,contrast,accessibility",
    "colors",
  ),

  // Text Processing
  addSlashes: createScript(
    AddSlashes,
    "Add Slashes",
    "Adds slashes before quotes",
    "💬",
    "slash,escape,quotes",
    "text-processing",
  ),
  removeSlashes: createScript(
    RemoveSlashes,
    "Remove Slashes",
    "Removes slashes before quotes",
    "🚫",
    "slash,unescape,quotes",
    "text-processing",
  ),
  trim: createScript(
    Trim,
    "Trim",
    "Removes whitespace from beginning and end",
    "✂️",
    "trim,whitespace,clean",
    "text-processing",
  ),
  trimStart: createScript(
    TrimStart,
    "Trim Start",
    "Removes whitespace from beginning",
    "✂️",
    "trim,start,whitespace",
    "text-processing",
  ),
  trimEnd: createScript(
    TrimEnd,
    "Trim End",
    "Removes whitespace from end",
    "✂️",
    "trim,end,whitespace",
    "text-processing",
  ),
  collapse: createScript(
    Collapse,
    "Collapse Whitespace",
    "Collapses multiple whitespace into single spaces",
    "📦",
    "collapse,whitespace,clean",
    "text-processing",
  ),
  deburr: createScript(
    Deburr,
    "Remove Accents",
    "Removes accents and diacritics from text",
    "🔤",
    "accent,diacritic,deburr,clean",
    "text-processing",
  ),
  replaceSmartQuotes: createScript(
    ReplaceSmartQuotes,
    "Replace Smart Quotes",
    "Replaces smart quotes with regular quotes",
    "💬",
    "quotes,smart,replace",
    "text-processing",
  ),

  // Line Operations
  joinLines: createScript(
    JoinLines,
    "Join Lines",
    "Joins all lines into a single line",
    "🔗",
    "join,lines,merge",
    "lines",
  ),
  joinLinesWithComma: createScript(
    JoinLinesWithComma,
    "Join Lines with Comma",
    "Joins lines with comma separator",
    "🔗",
    "join,lines,comma",
    "lines",
  ),
  joinLinesWithSpace: createScript(
    JoinLinesWithSpace,
    "Join Lines with Space",
    "Joins lines with space separator",
    "🔗",
    "join,lines,space",
    "lines",
  ),
  reverseLines: createScript(
    ReverseLines,
    "Reverse Lines",
    "Reverses the order of lines",
    "🔄",
    "reverse,lines,order",
    "lines",
  ),
  shuffleLines: createScript(
    ShuffleLines,
    "Shuffle Lines",
    "Randomly shuffles the order of lines",
    "🎲",
    "shuffle,lines,random",
    "lines",
  ),
  sort: createScript(Sort, "Sort Lines", "Sorts lines alphabetically", "📊", "sort,lines,alphabetical", "lines"),
  natSort: createScript(
    NatSort,
    "Natural Sort",
    "Sorts lines using natural sorting",
    "📊",
    "sort,natural,lines",
    "lines",
  ),
  removeDuplicates: createScript(
    RemoveDuplicates,
    "Remove Duplicates",
    "Removes duplicate lines",
    "🗑️",
    "duplicate,remove,unique",
    "lines",
  ),

  // Statistics
  countCharacters: createScript(
    CountCharacters,
    "Count Characters",
    "Counts the number of characters",
    "🔢",
    "count,characters,stats",
    "stats",
  ),
  countWords: createScript(CountWords, "Count Words", "Counts the number of words", "📝", "count,words,stats", "stats"),
  countLines: createScript(CountLines, "Count Lines", "Counts the number of lines", "📏", "count,lines,stats", "stats"),
  calculateSize: createScript(
    CalculateSize,
    "Calculate Size",
    "Calculates the size of text in bytes",
    "📐",
    "size,bytes,calculate",
    "stats",
  ),
  sumAll: createScript(
    SumAll,
    "Sum All Numbers",
    "Sums all numbers found in text",
    "➕",
    "sum,numbers,calculate,math",
    "stats",
  ),

  // Unicode
  toUnicode: createScript(
    toUnicode,
    "To Unicode",
    "Converts text to Unicode escape sequences",
    "🌍",
    "unicode,escape,convert",
    "unicode",
  ),
  fromUnicode: createScript(
    FromUnicode,
    "From Unicode",
    "Converts Unicode escape sequences to text",
    "🌍",
    "unicode,unescape,convert",
    "unicode",
  ),

  // Utility
  reverseString: createScript(
    ReverseString,
    "Reverse String",
    "Reverses the characters in text",
    "🔄",
    "reverse,string,characters",
    "utility",
  ),
  shuffleCharacters: createScript(
    ShuffleCharacters,
    "Shuffle Characters",
    "Randomly shuffles characters",
    "🎲",
    "shuffle,characters,random",
    "utility",
  ),
  loremIpsum: createScript(
    LoremIpsum,
    "Lorem Ipsum",
    "Generates Lorem Ipsum placeholder text",
    "📄",
    "lorem,ipsum,placeholder,generate",
    "utility",
  ),
  generateHashtag: createScript(
    generateHashtag,
    "Generate Hashtag",
    "Converts text to hashtag format",
    "#️⃣",
    "hashtag,social,convert",
    "utility",
  ),
  markdownQuote: createScript(
    MarkdownQuote,
    "Markdown Quote",
    "Formats text as Markdown blockquote",
    "💬",
    "markdown,quote,format",
    "utility",
  ),
  listToHTMLList: createScript(
    listToHTMLList,
    "List to HTML",
    "Converts text lines to HTML list",
    "📋",
    "html,list,convert",
    "utility",
  ),
  convertToMarkdownTable: createScript(
    convertToMarkdownTable,
    "Convert to Markdown Table",
    "Converts data to Markdown table",
    "📊",
    "markdown,table,convert",
    "utility",
  ),

  // Date/Time
  dateToTimestamp: createScript(
    DateToTimestamp,
    "Date to Timestamp",
    "Converts date to Unix timestamp",
    "⏰",
    "date,timestamp,unix,convert",
    "datetime",
  ),
  dateToUTC: createScript(
    DateToUTC,
    "Date to UTC",
    "Converts date to UTC format",
    "🌐",
    "date,utc,convert",
    "datetime",
  ),
  timeToSecond: createScript(
    TimeToSecond,
    "Time to Seconds",
    "Converts time format to seconds",
    "⏱️",
    "time,seconds,convert",
    "datetime",
  ),

  // Development
  evalJavascript: createScript(
    EvalJavascript,
    "Eval JavaScript",
    "Evaluates JavaScript code",
    "⚡",
    "javascript,eval,execute",
    "development",
  ),
  // File/Path
  fishHexPathConverter: createScript(
    FishHexPathConverter,
    "Fish Hex Path Converter",
    "Converts Fish shell hex paths",
    "🐟",
    "fish,hex,path,convert",
    "file-path",
  ),

  // Android/iOS
  androidIOSStrings: createScript(
    AndroidIOSStrings,
    "Android to iOS Strings",
    "Converts Android strings to iOS format",
    "📱",
    "android,ios,strings,convert",
    "mobile",
  ),
  iosAndroidStrings: createScript(
    IOSAndroidStrings,
    "iOS to Android Strings",
    "Converts iOS strings to Android format",
    "📱",
    "ios,android,strings,convert",
    "mobile",
  ),

  // Security
  urlDefang: createScript(
    URLDefang,
    "URL Defang",
    "Defangs URLs for security analysis",
    "🛡️",
    "url,defang,security",
    "security",
  ),
  urlRefang: createScript(URLRefang, "URL Refang", "Refangs defanged URLs", "🛡️", "url,refang,security", "security"),

  // Data Processing
  phpUnserialize: createScript(
    PhpUnserialize,
    "PHP Unserialize",
    "Unserializes PHP data",
    "📦",
    "php,unserialize,data",
    "data",
  ),
  sortJSON: createScript(SortJSON, "Sort JSON", "Sorts JSON object keys", "🔤", "json,sort,keys", "data"),
  lineComparer: createScript(
    LineComparer,
    "Line Comparer",
    "Compares lines between texts",
    "🔍",
    "compare,lines,diff",
    "data",
  ),

  // Special
  wadsworth: createScript(
    Wadsworth,
    "Wadsworth Constant",
    "Applies Wadsworth constant to text",
    "⏰",
    "wadsworth,constant,time",
    "special",
  ),
  wkbToWkt: createScript(
    WkbToWkt,
    "WKB to WKT",
    "Converts Well-Known Binary to Well-Known Text",
    "🗺️",
    "wkb,wkt,geo,convert",
    "geo",
  ),
  wktToWkb: createScript(
    WktToWkb,
    "WKT to WKB",
    "Converts Well-Known Text to Well-Known Binary",
    "🗺️",
    "wkt,wkb,geo,convert",
    "geo",
  ),

  // Project Management
  createProjectGlossaryMarkdown: createScript(
    CreateProjectGlossaryMarkdown,
    "Create Project Glossary",
    "Creates a project glossary in Markdown",
    "📚",
    "project,glossary,markdown",
    "project",
  ),
};

// Get all script keys
export const scriptKeys = Object.keys(scripts);

// Get scripts by category
export function getScriptsByCategory(category: string): BoopScript[] {
  return Object.values(scripts).filter((script) => script.metadata.category === category);
}

// Get all categories
export function getCategories(): string[] {
  const categories = new Set(Object.values(scripts).map((script) => script.metadata.category));
  return Array.from(categories).sort();
}

// Search scripts by name or tags
export function searchScripts(query: string): BoopScript[] {
  const lowerQuery = query.toLowerCase();
  return Object.values(scripts).filter(
    (script) =>
      script.metadata.name.toLowerCase().includes(lowerQuery) ||
      script.metadata.tags.toLowerCase().includes(lowerQuery) ||
      script.metadata.description.toLowerCase().includes(lowerQuery),
  );
}

// Get script by key
export function getScript(key: string): BoopScript | undefined {
  return scripts[key];
}

// Execute a script
export function executeScript(key: string, text: string): Promise<{ text: string; info?: string; error?: string }> {
  return new Promise((resolve, reject) => {
    const script = scripts[key];
    if (!script) {
      reject(new Error(`Script '${key}' not found`));
      return;
    }

    try {
      let info: string | undefined;
      let error: string | undefined;

      const state = {
        text,
        postError: (message: string) => {
          error = message;
        },
        postInfo: (message: string) => {
          info = message;
        },
      };

      script.main(state);

      // Ensure the result is always a string
      const resultText = String(state.text);
      resolve({ text: resultText, info, error });
    } catch (error) {
      reject(error);
    }
  });
}
