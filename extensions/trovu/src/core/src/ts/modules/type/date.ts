/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
export default class DateType {
  static parse(str, env) {
    const now = new Date();
    let date, matches;

    // Match '2', '2.', '22', '22.'.
    if (str.match(/^(\d{1,2})(\.)?$/)) {
      date = new Date();
      date.setDate(str);
      // If date in past: set it to next month.
      if (date < now) {
        date.setMonth(date.getMonth() + 1);
      }
    }
    // Match '22.11' and '22.11.'
    else if ((matches = str.match(/^(\d{1,2})\.(\d{1,2})(\.)?$/))) {
      const [, day, month] = matches;
      date = new Date();
      date.setMonth(month - 1, day);
      if (date < now) {
        date.setFullYear(date.getFullYear() + 1);
      }
    }
    // Match '22.11.13'
    else if ((matches = str.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2})?$/))) {
      const [, day, month, year] = matches;
      date = new Date(`${month}, ${day} ${year}`);
    }
    // Match '22.11.2013'
    else if ((matches = str.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})?$/))) {
      const [, day, month, year] = matches;
      date = new Date(`${month}, ${day} ${year}`);
    }

    // Match '11/22'.
    else if ((matches = str.match(/^(\d{1,2})\/(\d{1,2})$/))) {
      const [, month, day] = matches;
      date = new Date();
      date.setMonth(month - 1, day);
      if (date < now) {
        date.setFullYear(date.getFullYear() + 1);
      }
    }
    // Match '11/22/13'
    else if ((matches = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})?$/))) {
      const [, month, day, year] = matches;
      date = new Date(`${month}, ${day} ${year}`);
    }
    // Match '11/22/2013'
    else if ((matches = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})?$/))) {
      const [, month, day, year] = matches;
      date = new Date(`${month}, ${day} ${year}`);
    }
    // Match '+1' or '-2'
    else if ((matches = str.match(/^(-|\+)(\d+)$/))) {
      const [, operator, offset] = matches;
      switch (operator) {
        case "+":
          date = new Date();
          date.setDate(date.getDate() + parseInt(offset));
          break;
        case "-":
          date = new Date();
          date.setDate(date.getDate() - parseInt(offset));
          break;
      }
    }
    // Match 'Su', 'Mo', ...
    else if ((matches = str.match(/^([A-Za-z\u00E0-\u00FC]+)$/))) {
      const maps = env.data.types.date.days_of_the_week[env.language] || [];
      for (const map of maps) {
        const mapArray = map.split(" ");
        const desired_day_of_week_index = mapArray.indexOf(str.toLowerCase());
        if (desired_day_of_week_index > -1) {
          date = new Date();
          date.setDate(date.getDate() + desired_day_of_week_index - date.getDay());
          // If calculated day is in the past or today:
          // Set next week.
          if (date <= now) {
            date.setDate(date.getDate() + 7);
          }
          break;
        }
      }
    }

    return date;
  }
}
