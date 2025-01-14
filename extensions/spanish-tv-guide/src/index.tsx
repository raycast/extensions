import { showToast, Toast } from "@raycast/api";
import { useEffect, useReducer } from "react";

import { toLocalizedTvSchedule, TvScheduleDto } from "./modules/tv/domain/tvScheduleDto";
import { tvScheduleRepository } from "./modules/tv/repositories/tvScheduleRepository";
import { ERROR_MESSAGE, ErrorMessage } from "./components/ErrorMessage";
import { ChannelList } from "./components/ChannelList";
import { generateIcon } from "./utils/iconUtils";

export type State = {
  tvSchedule: TvScheduleDto;
  selectedChannel?: string;
  error?: Error;
};

const initialState: State = { tvSchedule: [] };
const reducer = (state: State, newState: Partial<State>) => ({ ...state, ...newState });

const Command = () => {
  const [state, setState] = useReducer(reducer, initialState);

  const initialize = async () => {
    return tvScheduleRepository
      .getAll()
      .then((tvSchedule) => toLocalizedTvSchedule(tvSchedule))
      .then((tvSchedule) => cacheIcons(tvSchedule).then(() => setState({ tvSchedule })))
      .catch((error) => setState({ error }));
  };

  useEffect(() => void initialize(), []);
  useEffect(() => state.error && void showToast({ style: Toast.Style.Failure, title: ERROR_MESSAGE }), [state.error]);

  return state.error ? <ErrorMessage /> : <ChannelList state={state} setState={setState} />;
};

const cacheIcons = (tvSchedule: TvScheduleDto) => Promise.all(tvSchedule.map(({ icon }) => generateIcon(icon)));

export default Command;
