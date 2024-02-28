/* eslint-disable*/
const fs = require("fs");
const path = require("path");
const parser = require("./tldr-parser.js").parser;
const util = require("util");

const MAX_EXAMPLES = 8;

module.exports.ERRORS = parser.ERRORS = {
  TLDR001: "File should contain no leading whitespace",
  TLDR002: "A single space should precede a sentence",
  TLDR003: "Descriptions should start with a capital letter",
  TLDR004: "Command descriptions should end in a period",
  TLDR005: "Example descriptions should end in a colon with no trailing characters",
  TLDR006: "Command name and description should be separated by an empty line",
  TLDR007: "Example descriptions should be surrounded by empty lines",
  TLDR008: "File should contain no trailing whitespace",
  TLDR009: "Page should contain a newline at end of file",
  TLDR010: "Only Unix-style line endings allowed",
  TLDR011: "Page never contains more than a single empty line",
  TLDR012: "Page should contain no tabs",
  TLDR013: "Title should be alphanumeric with dashes, underscores or spaces",
  TLDR014: "Page should contain no trailing whitespace",
  TLDR015: "Example descriptions should start with a capital letter",
  TLDR016: "Label for information link should be spelled exactly `More information: `",
  TLDR017: "Information link should be surrounded with angle brackets",
  TLDR018: "Page should only include a single information link",
  TLDR019: "Page should only include a maximum of 8 examples",

  TLDR101: "Command description probably not properly annotated",
  TLDR102: "Example description probably not properly annotated",
  TLDR103: "Command example is missing its closing backtick",
  TLDR104:
    "Example descriptions should prefer infinitive tense (e.g. write) over present (e.g. writes) or gerund (e.g. writing)",
  TLDR105: "There should be only one command per example",
  TLDR106: "Page title should start with a hash ('#')",
  TLDR107: "File name should end with .md extension",
  TLDR108: "File name should not contain whitespace",
  TLDR109: "File name should be lowercase",
};

(function (parser) {
  // Prepares state for a single page. Should be called before a run.
  parser.init = function () {
    this.yy.errors = [];
    this.yy.page = {
      description: [], // can be multiple lines
      informationLink: [],
      examples: [],
    };
  };
  parser.finish = function () {};
  parser.yy.ERRORS = parser.ERRORS;
  parser.yy.error = function (location, error) {
    if (!parser.ERRORS[error]) {
      throw new Error("Linter done goofed. '" + error + "' does not exist.");
    }
    parser.yy.errors.push({
      locinfo: location,
      code: error,
      description: parser.ERRORS[error],
    });
  };
  parser.yy.setTitle = function (title) {
    parser.yy.page.title = title;
  };
  parser.yy.addDescription = function (description) {
    parser.yy.page.description.push(description);
  };
  parser.yy.addInformationLink = function (url) {
    parser.yy.page.informationLink.push(url);
  };
  parser.yy.addExample = function (description, commands) {
    parser.yy.page.examples.push({
      description: description,
      commands: commands,
    });
  };
  // parser.yy.parseError = function(error, hash) {
  //   console.log(arguments);
  // };
  parser.yy.createToken = function (token) {
    return {
      type: "token",
      content: token,
    };
  };
  parser.yy.createCommandText = function (text) {
    return {
      type: "text",
      content: text,
    };
  };
  parser.yy.initLexer = function (lexer) {
    lexer.pushState = function (key, condition) {
      if (!condition) {
        condition = {
          ctx: key,
          rules: lexer._currentRules(),
        };
      }
      lexer.conditions[key] = condition;
      lexer.conditionStack.push(key);
    };

    lexer.checkNewline = function (nl, locinfo) {
      if (nl.match(/\r/)) {
        parser.yy.error(locinfo, "TLDR010");
      }
    };

    lexer.checkTrailingWhitespace = function (nl, locinfo) {
      if (nl !== "") {
        parser.yy.error(locinfo, "TLDR014");
      }
    };
  };
})(parser);

const linter = module.exports;

linter.parse = function (page) {
  parser.init();
  parser.parse(page);
  parser.finish();
  return parser.yy.page;
};

linter.formatDescription = function (str) {
  return str[0].toUpperCase() + str.slice(1) + ".";
};

linter.formatExampleDescription = function (str) {
  return str[0].toUpperCase() + str.slice(1) + ":";
};

linter.format = function (parsedPage) {
  let str = "";
  str += util.format("# %s", parsedPage.title);
  str += "\n\n";
  parsedPage.description.forEach(function (line) {
    str += util.format("> %s", linter.formatDescription(line));
    str += "\n";
  });
  parsedPage.informationLink.forEach(function (informationLink) {
    str += util.format("> More information: %s.", informationLink);
    str += "\n";
  });
  parsedPage.examples.forEach(function (example) {
    str += "\n";
    str += util.format("- %s", linter.formatExampleDescription(example.description));
    str += "\n\n";
    example.commands.forEach(function (command) {
      str += "`";
      command.forEach(function (textOrToken) {
        str += textOrToken.type === "token" ? util.format("{{%s}}", textOrToken.content) : textOrToken.content;
      });
      str += "`\n";
    });
  });
  return str;
};

linter.process = function (file, page, verbose, alsoFormat) {
  let success, result;
  let errorMsg = [];
  try {
    linter.parse(page);
    success = true;
  } catch (err) {
    errorMsg.push(`${file}:`);
    errorMsg.push(err.toString());
    success = false;
  }
  if (verbose) {
    errorMsg.push(parser.yy.page.description.length + " line(s) of description");
    errorMsg.push(parser.yy.page.examples.length + " examples");
    errorMsg.push(parser.yy.page.informationLink.length + " link(s)");
  }

  result = {
    page: parser.yy.page,
    errors: parser.yy.errors,
    success: success,
    errorMsg: errorMsg,
  };

  if (parser.yy.page.examples.length > MAX_EXAMPLES) {
    result.errors.push({ locinfo: { first_line: "0" }, code: "TLDR019", description: parser.ERRORS.TLDR019 });
  }

  if (alsoFormat) result.formatted = linter.format(parser.yy.page);

  for (const msg of errorMsg) {
    console.error(msg);
  }

  return result;
};

linter.processFile = function (file, verbose, alsoFormat, ignoreErrors) {
  const result = linter.process(file, fs.readFileSync(file, "utf8"), verbose, alsoFormat);
  console.log(result);
  if (path.extname(file) !== ".md") {
    result.errors.push({ locinfo: { first_line: "0" }, code: "TLDR107", description: parser.ERRORS.TLDR107 });
  }

  if (RegExp(/\s/).test(path.basename(file))) {
    result.errors.push({ locinfo: { first_line: "0" }, code: "TLDR108", description: parser.ERRORS.TLDR108 });
  }

  if (/[A-Z]/.test(path.basename(file))) {
    result.errors.push({ locinfo: { first_line: "0" }, code: "TLDR109", description: parser.ERRORS.TLDR109 });
  }

  if (ignoreErrors) {
    ignoreErrors = ignoreErrors.split(",").map(function (val) {
      return val.trim();
    });
    result.errors = result.errors.filter(function (error) {
      return !ignoreErrors.includes(error.code);
    });
  }

  return result;
};
