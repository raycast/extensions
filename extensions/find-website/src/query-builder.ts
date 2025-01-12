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
