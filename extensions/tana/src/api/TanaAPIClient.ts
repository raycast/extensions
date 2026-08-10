/* copy this from https://github.com/tanainc/tana-input-api-samples */
import { APIField, APINode, APIPlainNode, TanaNode } from "../types/types";
import fetch from "node-fetch";
import { attrDefTemplateId, coreTemplateId } from "../types/constants";

export class TanaAPIHelper {
  private endpoint = "https://europe-west1-tagr-prod.cloudfunctions.net/addToNodeV2";

  private get schemaNodeId() {
    return `SCHEMA`;
  }

  constructor(
    public token: string,
    public endpointUrl?: string,
  ) {
    this.token = token;

    if (endpointUrl) {
      this.endpoint = endpointUrl;
    }
  }

  async createFieldDefinitions(fields: APIPlainNode[]) {
    const payload = {
      targetNodeId: this.schemaNodeId,
      nodes: fields.map((field) => ({
        name: field.name,
        description: field.description,
        supertags: [{ id: attrDefTemplateId }],
      })),
    };

    const createdFields = await this.makeRequest(payload);

    return createdFields.map((field) => ({
      name: field.name,
      description: field.description,
      id: field.nodeId,
    }));
  }

  async createTagDefinition(node: APIPlainNode) {
    if (!node.supertags) {
      node.supertags = [];
    }
    node.supertags.push({ id: coreTemplateId });
    const payload = {
      targetNodeId: this.schemaNodeId,
      nodes: [node],
    };

    const createdTag = await this.makeRequest(payload);
    return createdTag[0].nodeId;
  }

  async createNode(node: APINode, targetNodeId?: string) {
    const payload = {
      targetNodeId: targetNodeId,
      nodes: [node],
    };

    const createdNode = await this.makeRequest(payload);
    return createdNode[0];
  }

  async setNodeName(newName: string, targetNodeId?: string) {
    const payload = {
      targetNodeId: targetNodeId,
      setName: newName,
    };

    const createdNode = await this.makeRequest(payload);
    return createdNode;
  }

  async addField(field: APIField, targetNodeId?: string) {
    const payload = {
      targetNodeId: targetNodeId,
      nodes: [field],
    };

    const createdNode = await this.makeRequest(payload);
    return createdNode;
  }

  private async makeRequest(
    payload: { targetNodeId?: string } & ({ nodes: (APINode | APIField)[] } | { setName: string }),
  ): Promise<TanaNode[]> {
    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + this.token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (response.status === 200 || response.status === 201) {
      const json = await response.json();
      if ("setName" in payload) {
        return [json] as TanaNode[];
      } else {
        return (json as { children: TanaNode[] }).children as TanaNode[];
      }
    }
    console.log(await response.text());
    throw new Error(`${response.status} ${response.statusText}`);
  }
}
