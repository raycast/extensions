import { Action, ActionPanel, List } from "@raycast/api";
import { executeSQL } from "@raycast/utils";
import { Adapter } from "./adapters";
import { Record } from "./record";

export class FinalStep<T extends Record> {
  dir: string;
  query: string;
  adapter: Adapter<T>;

  constructor(dir: string, query: string, adapter: Adapter<T>) {
    this.dir = dir;
    this.query = query;
    this.adapter = adapter;
  }

  async process(): Promise<Payload<T>> {
    console.log(`Query: ${this.query}`);
    const data = await executeSQL<T>(this.dir, this.query);
    console.log(`Data: ${JSON.stringify(data)}`);

    return new MergePayload([]).mergeView(data, this.adapter);
  }
}

export class Step<T extends Record> extends FinalStep<T> {
  nextStep: FinalStep<T>;

  constructor(dir: string, query: string, adapter: Adapter<T>, nextStep: FinalStep<T>) {
    super(dir, query, adapter);
    this.nextStep = nextStep;
  }

  async process(): Promise<Payload<T>> {
    const payload = await this.nextStep.process();

    console.log(`Query: ${this.query}`);
    const data = await executeSQL<T>(this.dir, this.query);
    console.log(`Data: ${JSON.stringify(data)}`);

    return payload.acum(data, this.adapter);
  }
}

interface Payload<T extends Record> {
  acum(data: T[], adapter: Adapter<T>): Payload<T>;
  render(): JSX.Element[];
}

class MergePayload<T extends Record> implements Payload<T> {
  list: JSX.Element[];

  constructor(list: JSX.Element[]) {
    this.list = list;
  }

  render() {
    return this.list;
  }

  acum(data: T[], adapter: Adapter<T>): Payload<T> {
    return new MergePayload(this.list).mergeView(data, adapter);
  }

  mergeView(data: T[] | undefined, adapter: Adapter<T>) {
    this.list = this.list.concat((data || []).map((record, i) => this.generateView(record, i, adapter)));

    return this;
  }

  generateView(record: T, i: number, adapter: Adapter<T>) {
    const result = adapter.adapt(record, i);
    return (
      <List.Item
        key={result.key}
        title={result.title}
        subtitle={result.subtitle}
        icon={result.icon}
        accessories={result.accessories}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser url={result.url} />
          </ActionPanel>
        }
      />
    );
  }
}
