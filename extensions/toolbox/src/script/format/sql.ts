import { Script } from "../type";
import { format } from "sql-formatter";
import vkbeautify from "vkbeautify";

export const formatSql: Script = {
  info: {
    title: "Format SQL",
    desc: "Format SQL queries",
    type: ["form", "clipboard"],
    keywords: ["queries", "prettify"],
    example: "SELECT test, test, test FROM xxx WHERE xxx = 1 ORDER BY xxx LIMIT 1, 1",
  },
  run(input) {
    try {
      return format(input, {
        keywordCase: "upper",
        tabWidth: 2,
      });
    } catch (error) {
      throw Error("Invalid SQL");
    }
  },
};

export const minifySql: Script = {
  info: {
    title: "Minify SQL",
    desc: "Cleans and minifies SQL queries",
    type: ["form", "clipboard"],
    example: "SELECT test, test, test \nFROM xxx \nWHERE xxx = 1 \nORDER BY xxx \nLIMIT 1, 1",
  },
  run(input) {
    try {
      return vkbeautify.sqlmin(input);
    } catch (error) {
      throw Error("Invalid SQL");
    }
  },
};
