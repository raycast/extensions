import type { NewTransferError, NewTransferParams } from "@putdotio/api-client";
import { getPutioClient } from "./withPutioClient";

type AddTransfersResult =
  | {
      type: "success";
    }
  | {
      type: "partial-success";
      errors: NewTransferError[];
    }
  | {
      type: "failure";
      error: NewTransferError;
    }
  | {
      type: "multi-failure";
      errors: NewTransferError[];
    };

const textToNewTransferParams = (text: string): NewTransferParams[] =>
  text
    .split("\n")
    .filter((line) => !!line)
    .map((url) => ({ url }));

export const addTransfers = async (text: string): Promise<AddTransfersResult> => {
  const params = textToNewTransferParams(text);

  try {
    const {
      data: { transfers, errors },
    } = await getPutioClient().Transfers.AddMulti(params);

    if (transfers.length === 0) {
      return errors.length === 1
        ? {
            type: "failure",
            error: errors[0],
          }
        : {
            type: "multi-failure",
            errors,
          };
    }

    if (errors.length !== 0) {
      return {
        type: "partial-success",
        errors,
      };
    }

    return {
      type: "success",
    };
  } catch (error) {
    return {
      type: "failure",
      error: error as NewTransferError,
    };
  }
};

export const fetchTransfers = async () => {
  const response = await getPutioClient().Transfers.Query();
  return response.data;
};
