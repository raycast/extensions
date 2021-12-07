import { Script } from "../type";
import vkbeautify from "vkbeautify";

export const foramtSql: Script = {
  info: {
    title: "Format SQL",
    desc: "Format SQL queries",
    type: ["form", "clipboard"],
    keywords: ["queries", "prettify"],
    example: "SELECT ca.proj_id AS proj_id, FROM rotations r WHERE r.proj_id = proj_id GROUP BY r.proj_id) r_count",
  },
  run(input) {
    try {
      return vkbeautify.sql(input);
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
    example: "SELECT ca.proj_id AS proj_id, FROM rotations r WHERE r.proj_id = proj_id GROUP BY r.proj_id) r_count",
  },
  run(input) {
    try {
      return vkbeautify.sqlmin(input);
    } catch (error) {
      throw Error("Invalid SQL");
    }
  },
};
