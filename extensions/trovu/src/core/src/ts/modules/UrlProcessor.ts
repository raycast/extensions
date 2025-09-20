/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck

/** @module UrlProcessor */
import CityType from "./type/city";
import DateType from "./type/date";
import TimeType from "./type/time";
import dayjs from "dayjs";
import escapeStringRegexp from "escape-string-regexp";
import jsyaml from "js-yaml";

/** Process a shortcut URL for redirect. */

export default class UrlProcessor {
  static getPlaceholdersFromString(str, prefix) {
    const pattern = "<" + prefix + "(.+?)>";
    const re = RegExp(pattern, "g");
    let match;
    const placeholders = {};
    while ((match = re.exec(str))) {
      const { name, placeholder } = this.getPlaceholderFromMatch(match);
      placeholders[name] = placeholders[name] || {};
      placeholders[name][match[0]] = placeholder;
    }
    return placeholders;
  }

  /**
   * Get placeholder names from a string.
   *
   * @param {string} str    - The string containing placeholders.
   * @param {string} prefix - The prefix of the placeholders. Must be Regex-escaped.
   *
   * @return {object} placeholders - Array keyed with the arguments names and with an array of corresponding placeholders.
   *
   *   If the placeholder with the same name occurs multiple times, there are also
   *   multiple arrays in the nested array.
   *
   *   Example:
   *     http://{%first|type=foo}{%first|type=bar}
   *   becomes: {
   *     first: {
   *       '{%first|type=foo}': {
   *         type: foo
   *       }
   *       '{%first|type=bar}': {
   *         type: bar
   *       }
   *     }
   *   }
   */
  static getPlaceholdersFromStringLegacy(str, prefix) {
    const pattern = "{" + prefix + "(.+?)}";
    const re = RegExp(pattern, "g");
    let match;
    const placeholders = {};
    while ((match = re.exec(str))) {
      const { name, placeholder } = this.getPlaceholderFromMatchLegacy(match);
      placeholders[name] = placeholders[name] || {};
      placeholders[name][match[0]] = placeholder;
    }
    return placeholders;
  }

  static getPlaceholderFromMatch(match) {
    const yaml = match[1];
    const parsed = jsyaml.load(yaml);
    if (typeof parsed === "string") {
      const name = parsed;
      const placeholder = {};
      return { name, placeholder };
    } else {
      const name = Object.keys(parsed)[0];
      const placeholder = parsed[name];
      return { name, placeholder };
    }
  }

  static getPlaceholderFromMatchLegacy(match) {
    // Example value:
    // match[1] = 'query|encoding=utf-8|another=attribute'
    const nameAndAttributes = match[1].split("|");
    // Example value:
    // name = 'query'
    const name = nameAndAttributes.shift();
    const placeholder = {};
    // Example value:
    // name_and_attributes = ['encoding=utf-8', 'another=attribute']
    for (const attrStr of nameAndAttributes) {
      const [attrName, attrValue] = attrStr.split("=", 2);
      placeholder[attrName] = attrValue;
    }
    return { name, placeholder };
  }

  /**
   * Get argument names from a string.
   *
   * @param {string} str    - The string containing placeholders.
   *
   * @return {object} placeholders - Array keyed with the arguments names and with an array of corresponding placeholders.
   */
  static getArgumentsFromString(str) {
    const placeholders = {};
    Object.assign(placeholders, this.getPlaceholdersFromString(str, "(?![\\$])"));
    Object.assign(placeholders, this.getPlaceholdersFromStringLegacy(str, "%"));
    return placeholders;
  }

  /**
   * Get variable names from a string.
   *
   * @param {string} str    - The string containing placeholders.
   *
   * @return {object} placeholders - Array keyed with the arguments names and with an array of corresponding placeholders.
   */
  static getVariablesFromString(str) {
    const variables = {};
    Object.assign(variables, this.getPlaceholdersFromString(str, "\\$"));
    Object.assign(variables, this.getPlaceholdersFromStringLegacy(str, "\\$"));
    return variables;
  }

  /**
   * Replace arguments in a string.
   *
   * @param {string} str    - The string containing placeholders.
   * @param {array}  args   - The arguments to replace.
   *
   * @return {string} str   - The string with the replaced placeholders.
   */
  static replaceArguments(str, args, env) {
    const placeholders = this.getArgumentsFromString(str);

    for (const argumentName in placeholders) {
      let argument = args.shift().trim();

      // An argument can have multiple matches,
      // so go over all of them.
      const matches = placeholders[argumentName];
      for (const match in matches) {
        argument = this.processAttributes(argument, matches[match], env);
        while (str.includes(match)) {
          str = str.replace(match, argument);
        }
      }
    }
    return str;
  }

  static processAttributes(processedArgument, attributes, env) {
    processedArgument = this.processAttributeType(attributes, processedArgument, env);
    processedArgument = this.processAttributeTransform(attributes, processedArgument);
    processedArgument = this.processAttributeEncoding(attributes, processedArgument);
    return processedArgument;
  }

  static processAttributeType(attributes, processedArgument, env) {
    switch (attributes.type) {
      case "date":
        processedArgument = this.processTypeDate(processedArgument, attributes, env);
        break;
      case "time":
        processedArgument = this.processTypeTime(processedArgument, attributes);
        break;
      case "city":
        processedArgument = this.processTypeCity(processedArgument, env);
        break;
    }
    return processedArgument;
  }

  static processTypeDate(processedArgument, attributes, env) {
    const dateNative = DateType.parse(processedArgument, env);
    // If date could be parsed:
    // Set argument.
    if (dateNative) {
      const date = dayjs(dateNative);
      let format = "YYYY-MM-DD";
      if (attributes.output) {
        format = attributes.output;
      }
      processedArgument = date.format(format);
    }
    return processedArgument;
  }

  static processTypeTime(processedArgument, attributes) {
    const timeNative = TimeType.parse(processedArgument);
    const time = dayjs(timeNative);
    // If time could be parsed:
    // Set argument.
    if (time) {
      let format = "HH:mm";
      if (attributes.output) {
        format = attributes.output;
      }
      processedArgument = time.format(format);
    }
    return processedArgument;
  }

  static processTypeCity(processedArgument, env) {
    const city = CityType.parse(processedArgument, env);
    // If city could be parsed:
    // Set argument.
    if (city) {
      processedArgument = city;
    }
    return processedArgument;
  }

  static processAttributeTransform(attributes, processedArgument) {
    switch (attributes.transform) {
      case "uppercase":
        processedArgument = processedArgument.toUpperCase();
        break;
      case "lowercase":
        processedArgument = processedArgument.toLowerCase();
        break;
      case "eo-cx":
        processedArgument = this.transformEoCx(processedArgument);
        break;
    }
    return processedArgument;
  }

  static processAttributeEncoding(attributes, processedArgument) {
    switch (attributes.encoding) {
      case "iso-8859-1":
        // TODO: replace with encodeURIComponent
        // check if no regression.
        processedArgument = escape(processedArgument);
        break;
      case "none":
        break;
      default:
        processedArgument = encodeURIComponent(processedArgument);
        break;
    }
    return processedArgument;
  }

  /**
   * Replace variables in a string.
   *
   * @param {string} str        - The string containing placeholders.
   * @param {array}  variables  - The variables to replace.
   *
   * @return {string} str       - The string with the replaced variables.
   */
  static replaceVariables(str, variables) {
    const placeholders = this.getVariablesFromString(str);

    for (const varName in placeholders) {
      const matches = placeholders[varName];
      let value;
      for (const match in matches) {
        const attributes = matches[match];
        switch (varName) {
          case "now": {
            const time = dayjs();

            let format = "HH:mm";
            if (attributes.output) {
              format = attributes.output;
            }
            value = time.format(format);

            break;
          }
          default:
            value = variables[varName];
            break;
        }
        str = str.replace(new RegExp(escapeStringRegexp(match), "g"), value);
      }
    }
    return str;
  }

  /**
   * Replaces Esperanto character codes in a given string with their corresponding characters.
   *
   * @param {string} str - The input string to map Esperanto character codes from.
   *
   * @returns {string} The resulting string with mapped Esperanto character codes.
   */
  static transformEoCx(str) {
    const charMap = {
      cx: "ĉ",
      gx: "ĝ",
      hx: "ĥ",
      jx: "ĵ",
      sx: "ŝ",
      ux: "ŭ",
      CX: "Ĉ",
      GX: "Ĝ",
      HX: "Ĥ",
      JX: "Ĵ",
      SX: "Ŝ",
      UX: "Ŭ",
      Cx: "Ĉ",
      Gx: "Ĝ",
      Hx: "Ĥ",
      Jx: "Ĵ",
      Sx: "Ŝ",
      Ux: "Ŭ",
    };

    const regex = new RegExp(Object.keys(charMap).join("|"), "g");
    str = str.replace(regex, (matched) => charMap[matched]);
    return str;
  }
}
