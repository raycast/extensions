import { ClassificationSpecificEnum } from "@pieces.app/pieces-os-client";

/**
 * Returns the icon path associated with a given classification.
 *
 * @param {ClassificationSpecificEnum} classification - The classification for which to get the icon path.
 * @returns {string} The icon path corresponding to the provided classification.
 */
export default function getClassificationIcon(
  classification: ClassificationSpecificEnum,
) {
  return classificationToIconPath[classification.toLowerCase()];
}

const classificationToIconPath: { [key: string]: string } = {
  asp: "classifications/asp.png",
  bat: "classifications/batchfile-white.png",
  c: "classifications/c.png",
  cs: "classifications/c-sharp.png",
  cpp: "classifications/cpp.png",
  css: "classifications/css.png",
  clj: "classifications/clojure.png",
  coffee: "classifications/coffeescript-white.png",
  cfm: "classifications/coldfusion.png",
  dart: "classifications/dart.png",
  erl: "classifications/erlang.png",
  ex: "classifications/elixir.png",
  el: "classifications/emacslisp.png",
  go: "classifications/go.png",
  groovy: "classifications/groovy.png",
  hs: "classifications/haskell.png",
  html: "classifications/html.png",
  java: "classifications/java.png",
  js: "classifications/javascript.png",
  json: "classifications/json.png",
  kt: "classifications/kotlin.png",
  lua: "classifications/lua.png",
  md: "classifications/markdown-white.png",
  matlab: "classifications/matlab.png",
  m: "classifications/objective-c.png",
  pl: "classifications/perl.png",
  php: "classifications/php.png",
  text: "classifications/text.png",
  ps1: "classifications/powershell.png",
  py: "classifications/python.png",
  rb: "classifications/ruby.png",
  r: "classifications/r.png",
  rs: "classifications/rust.png",
  scala: "classifications/scala.png",
  sh: "classifications/bash-white.png",
  sol: "classifications/solidity.png",
  sql: "classifications/sql.png",
  swift: "classifications/swift.png",
  sv: "classifications/system_verilog.png",
  tex: "classifications/tex.png",
  toml: "classifications/toml-white.png",
  ts: "classifications/typescript.png",
  txt: "classifications/text.png",
  xml: "classifications/xml.png",
  yaml: "classifications/yaml-white.png",
};
