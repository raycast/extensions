export class QueryBuilder {
  buildQuery(size: number, text: string, order: string) {
    const select = this.select();
    const from = `from ${this.table()}`;
    const where = `where (${this.filters(text)})`;
    const limit = `limit ${size}`;

    return [select, from, where, order, limit].join(" ");
  }

  select(): string {
    return "";
  }

  filters(text: string) {
    const words = this.words(text);
    const titleFilter = this.filterBlock(words, "and", "title");
    const hostFilter = this.filterBlock(words, "and", this.hostColumn());

    return `(${titleFilter}) or (${hostFilter})`;
  }

  filterBlock(words: string[], op: string, column: string) {
    return words.map((w) => `${column} like '${w}'`).join(` ${op} `);
  }

  words(text: string) {
    return text.split(" ").map((w) => `%${w}%`);
  }

  queryTopVisited(size: number, text: string) {
    const order = `order by visit_count desc`;

    return this.buildQuery(size, text, order);
  }

  queryRecents(size: number, text: string) {
    const order = `order by last_visit_time desc`;

    return this.buildQuery(size, text, order);
  }

  table() {
    return "";
  }

  hostColumn() {
    return "";
  }
}

export class ChromeQueryBuilder extends QueryBuilder {
  select(): string {
    return "select distinct id as id, title as title, url as url, datetime(last_visit_time / 1000000 + (strftime('%s', '1601-01-01')), 'unixepoch', 'localtime') as lastVisitTime, visit_count as visitCount, typed_count as typedCount, hidden as hidden";
  }

  table() {
    return "urls";
  }

  hostColumn() {
    return "url";
  }
}

export class ArcQueryBuilder extends ChromeQueryBuilder {}
export class BraveQueryBuilder extends ChromeQueryBuilder {}
export class VivaldiQueryBuilder extends ChromeQueryBuilder {}
export class OperaQueryBuilder extends ChromeQueryBuilder {}
export class EdgeQueryBuilder extends ChromeQueryBuilder {}

export class OrionQueryBuilder extends QueryBuilder {
  select(): string {
    return "select distinct id as id, title as title, url as url, host as host, last_visit_time as lastVisitTime, visit_count as visitCount, typed_count as typedCount";
  }

  table() {
    return "history_items";
  }

  hostColumn() {
    return "host";
  }
}

export class SafariQueryBuilder extends QueryBuilder {
  queryTopVisited(size: number, text: string) {
    return `
      select i.id, v.title as title, i.url as url, i.visit_count as visitCount
      from history_visits v, history_items i
      where v.history_item = i.id and (${this.filters(text)})
      group by i.id, v.title, i.url, i.visit_count
      order by visit_time desc
      limit ${size}
    `;
  }

  queryRecents(size: number, text: string) {
    return `
      select distinct i.id, v.title as title, i.url as url, datetime(v.visit_time + 978307200, 'unixepoch', 'localtime') as visitTime
      from history_visits v, history_items i
      where v.history_item = i.id and (${this.filters(text)})
      order by visit_time desc
      limit ${size}
    `;
  }

  hostColumn() {
    return "url";
  }
}

export class FirefoxQueryBuilder extends QueryBuilder {
  queryRecents(size: number, text: string) {
    const order = `order by last_visit_date desc`;

    return this.buildQuery(size, text, order);
  }

  select(): string {
    return "select distinct id as id, title as title, url as url, datetime(last_visit_date/1000000, 'unixepoch', 'localtime') as lastVisitDate, visit_count as visitCount";
  }

  table() {
    return "moz_places";
  }

  hostColumn() {
    return "url";
  }
}

export class ZenQueryBuilder extends FirefoxQueryBuilder {}
