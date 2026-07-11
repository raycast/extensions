import { Input, Output, IWorkflow, WorkflowConfigs, WorkflowNode } from "./types";
import resolveAction from "./actions";
import { EasyImager } from "./supports/image";
import React from "react";
import logger, { MarkdownLogger, Stage } from "./supports/logger";

export async function createWorkflow(
  configs: WorkflowConfigs,
  nodes: WorkflowNode[],
  logger: MarkdownLogger,
): Promise<IWorkflow> {
  if (!nodes || nodes.length === 0) {
    return new NullWorkflow();
  }

  return new Workflow(nodes, configs, logger);
}

export function createMarkdownLogger(nodes: WorkflowNode[], stater?: React.Dispatch<React.SetStateAction<string>>) {
  return logger.markdownLogger(
    nodes.map((n) => ({ name: n.name, status: "todo" }) as Stage),
    stater,
  );
}

class Workflow implements IWorkflow {
  private readonly nodes: WorkflowNode[];
  private readonly configs: WorkflowConfigs;
  private readonly logger: MarkdownLogger;

  constructor(nodes: WorkflowNode[], configs: WorkflowConfigs, logger: MarkdownLogger) {
    this.nodes = nodes;
    this.configs = configs;
    this.logger = logger;
  }

  async run(i: Input) {
    const imager = new EasyImager(i);
    return (await this.nodes.reduce(async (acc: Promise<Input>, cur: WorkflowNode) => {
      const input = await acc;
      const fn = resolveAction(cur.action)(input, cur.params, this.configs.services, imager);

      return this.terminate(cur, this.wrapWithProcessing(cur, fn));
    }, Promise.resolve(i))) as Output;
  }

  wrapWithProcessing(_: WorkflowNode, fn: Promise<Input>): Promise<Input> {
    // todo: add processing

    return Promise.resolve(fn);
  }

  async terminate(n: WorkflowNode, fn: Promise<Input>): Promise<Input> {
    try {
      const output = await fn;
      this.logger.finish(n.name, output.value);
      return output;
    } catch (e) {
      this.logger.log(n.name, e instanceof Error ? e.message : "An error occurred", "fail");
      return Promise.reject(e);
    }
  }
}

class NullWorkflow implements IWorkflow {
  async run(i: Input) {
    return i as Output;
  }
}
