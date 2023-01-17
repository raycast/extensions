import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import fetch from "node-fetch";
import { TrelloFetchResponse } from "../trelloResponse.model";
import { returnBoards } from "./utils/fetchBoards";

const res = returnBoards();
console.log(res);