class VariableDate {
  year: string;
  month: string;
  day: string;
  hour: string;
  minute: string;
  second: string;
  constructor(date = new Date()) {
    this.year = date.getFullYear().toString();
    this.month = date.getMonth().toString();
    this.day = date.getDate().toString();
    this.hour = date.getHours().toString();
    this.minute = date.getMinutes().toString();
    this.second = date.getSeconds().toString();
  }
}

class VariableInput {
  text: string;
  line: string;
  word: string;
  character: string;

  constructor(text = "", line = "", word = "", character = "") {
    this.text = text;
    this.line = line;
    this.word = word;
    this.character = character;
  }
}
class VariableInfo {
  email: string;
  user: string;

  constructor(email = "", user = "") {
    this.email = email;
    this.user = user;
  }
}

export class Types {
  info: VariableInfo;
  date: VariableDate;
  input: VariableInput;

  constructor(info = new VariableInfo(), date = new VariableDate(), input = new VariableInput()) {
    this.info = info;
    this.date = date;
    this.input = input;
  }
}

export const variables = [
  { title: "Types", value: "" },

  { title: "input.text", value: "$TEXT$" },
  { title: "input.line", value: "$LINE$" },
  { title: "input.word", value: "$WORD$" },

  { title: "form.lineBreak", value: "$LINEBREAK$" },

  { title: "date.year", value: "$YEAR$" },
  { title: "date.month", value: "$MONTH$" },
  { title: "date.day", value: "$DAY$" },

  { title: "date.hour", value: "$HOUR$" },
  { title: "date.minute", value: "$MINUTE$" },
  { title: "date.second", value: "$SECOND$" },
  { title: "date.timestamp", value: "$TIMESTAMP$" },

  { title: "text.statistics", value: "$STATISTICS$" },
];
