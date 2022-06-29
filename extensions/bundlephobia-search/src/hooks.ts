import * as React from "react";
import { Package, SizeData, State } from "./types";
import { getSizeData, searchPackage } from "./api";
import { showToast, Toast } from "@raycast/api";

export const usePackages = (query: string) => {
  const [state, setState] = React.useState<State<Package[]>>({
    status: "idle",
  });

  const fetchData = React.useCallback(async () => {
    if (query.length < 3) {
      return;
    }

    setState({ status: "loading" });
    try {
      const data = await searchPackage(query);
      setState({ status: "success", data });
    } catch (e: any) {
      setState({ status: "error", error: e.message });
    }
  }, [query]);

  React.useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const items = state.status === "success" ? state.data : [];

  return {
    state,
    items,
  };
};

export const useSizeData = (name: string) => {
  const [state, setState] = React.useState<State<SizeData>>({ status: "idle" });

  const fetchData = React.useCallback(async () => {
    setState({ status: "loading" });
    try {
      const data = await getSizeData(name);
      setState({ status: "success", data });
    } catch (e: any) {
      setState({
        status: "error",
        error: e.response?.data?.error?.message || e.message || "Unknown Error",
      });
    }
  }, [name]);

  React.useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return { state };
};

export const useToastError = (
  state: State<unknown>,
  title = "Something went wrong"
) => {
  React.useEffect(() => {
    if (state.status === "error") {
      void showToast({
        style: Toast.Style.Failure,
        title: title,
        message: state.error,
      });
    }
  }, [state]);
};
