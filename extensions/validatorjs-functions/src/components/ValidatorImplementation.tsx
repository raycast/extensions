// src/components/ValidatorImplementation.tsx

import { Detail, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import { ValidatorFunction, ValidatorFunctionWithImpl } from "../types";
import { loadImplementation } from "../utils/github";
import { ValidatorDetail } from "./ValidatorDetail";

interface Props {
  validator: ValidatorFunction;
  headers?: Record<string, string>;
}

/**
 * ValidatorImplementation is a React component that loads and displays the implementation details
 * of a given validator function. It handles loading states and errors, providing feedback to the user.
 *
 * @param {Props} props - The properties object.
 * @param {ValidatorFunction} props.validator - The validator function for which to load the implementation.
 * @param {Record<string, string>} [props.headers] - Optional HTTP headers for the implementation request.
 * @returns {JSX.Element} A React component that displays loading, error, or implementation details.
 */
export function ValidatorImplementation({ validator, headers }: Props): JSX.Element {
  // State to manage loading status, error information, and the loaded implementation function.
  const [state, setState] = useState<{
    loading: boolean;
    error: Error | null;
    implFunc: ValidatorFunctionWithImpl | null;
  }>({
    loading: true,
    error: null,
    implFunc: null,
  });

  useEffect(() => {
    /**
     * Asynchronously loads the implementation of the validator function.
     * Updates the component state based on the success or failure of the operation.
     */
    const loadImplementationAsync = async () => {
      try {
        const implementation = await loadImplementation(validator, headers);
        setState({ loading: false, error: null, implFunc: implementation });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        setState({ loading: false, error: new Error(errorMessage), implFunc: null });
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load implementation",
          message: errorMessage,
        });
      }
    };

    // Trigger the asynchronous loading of the implementation when the component mounts or dependencies change.
    loadImplementationAsync();
  }, [validator, headers]);

  const { loading, error, implFunc } = state;

  // Render a loading indicator if the implementation is still being loaded.
  if (loading) {
    return <Detail isLoading={true} navigationTitle={validator.name} />;
  }

  // Render an error message if there was an error loading the implementation or if the implementation is null.
  if (error || !implFunc) {
    return (
      <Detail
        markdown={`Error: ${error?.message || "Failed to load implementation. Please try again."}`}
        navigationTitle="Error"
      />
    );
  }

  // Render the ValidatorDetail component with the loaded implementation details.
  return <ValidatorDetail validator={implFunc} />;
}
