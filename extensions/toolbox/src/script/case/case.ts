import { Script } from "../type";
import { camelCase as cc, startCase as sc, kebabCase as kb, snakeCase as snc } from "lodash";

export const camelCase: Script = {
  info: {
    title: "Camel Case",
    desc: "Convert your text to Camel Case",
    type: ["list", "form", "clipboard"],
    example: "ray cast",
  },
  run(input) {
    return cc(input);
  },
};

export const startCase: Script = {
  info: {
    title: "Start Case",
    desc: "Convert your text to Start Case",
    type: ["list", "form", "clipboard"],
    example: "aaa bbb ccc ddd eee",
  },
  run(input) {
    return sc(input);
  },
};

export const snakeCase: Script = {
  info: {
    title: "Snake Case",
    desc: "Convert your text to Snake Case",
    type: ["list", "form", "clipboard"],
    example: "aaa bbb ccc ddd eee",
  },
  run(input) {
    return snc(input);
  },
};

export const kebabCase: Script = {
  info: {
    title: "Kebab Case",
    desc: "Convert your text to Kebab Case",
    type: ["list", "form", "clipboard"],
    example: "aaa bbb ccc ddd eee",
  },
  run(input) {
    return kb(input);
  },
};

export const upCase: Script = {
  info: {
    title: "Upper Case",
    desc: "Convert your text to Upper Case",
    type: ["list", "form", "clipboard"],
    keywords: ["capital"],
    example: "raycast",
  },
  run(input) {
    return input.toUpperCase();
  },
};

export const downCase: Script = {
  info: {
    title: "Lower Case",
    desc: "Convert your text to Lower Case",
    type: ["list", "form", "clipboard"],
    keywords: ["lower"],
    example: "RAYCAST",
  },
  run(input) {
    return input.toLowerCase();
  },
};
