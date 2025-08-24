import { Action, Tool } from "@raycast/api";
import { deleteInstance } from "../services/deleteService";

/**
 * Represents a field value pair for an instance
 */
type InstanceField = {
  /**
   * The name of the field
   */
  name: string;
  /**
   * The value of the field
   */
  value: string;
};

type Input = {
  /**
   * The entity data name of the instance to delete
   */
  entityDataName: string;
  /**
   * The ID of the instance to delete
   */
  instanceId: string;
  /**
   * The name of the entity (for display purposes)
   */
  entityName: string;
  /**
   * Array of field name/value pairs representing the instance's key data
   */
  instanceDetails: InstanceField[];
};

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  // Create info items from instance details
  const info = input.instanceDetails.map((field) => ({
    name: field.name,
    value: field.value,
  }));

  // Add entity information as the first item
  info.unshift({
    name: "Entity",
    value: input.entityName,
  });

  // Add instance ID information
  info.push({
    name: "Instance ID",
    value: input.instanceId,
  });

  return {
    message:
      "Are you sure you want to delete the following instance?\n\nThe instance will be moved to the Recycle Bin.",
    style: Action.Style.Destructive,
    info,
  };
};

/**
 * Deletes an instance in Origami
 */
export default async function tool(input: Input) {
  const response = await deleteInstance(input.entityDataName, input.instanceId);

  return response;
}
