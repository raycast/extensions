import { useFetch } from "@raycast/utils";
import { API_URL } from "../config/env";
import { Player } from "../types/player";
import { useEffect } from "react";
import { Toast, showToast } from "@raycast/api";

export const useGetPlayers = (endpoint: "race" | "live-ranking") => {
	const { data: players, isLoading, error } = useFetch<Player[]>(`${API_URL}/${endpoint}`);

	useEffect(() => {
		if (error) {
			showToast({
				style: Toast.Style.Failure,
				title: "Something went wrong",
				message: error.message,
			});
		}
	}, [error]);

	return { players, isLoading };
};
