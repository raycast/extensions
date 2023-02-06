import { EVENTS_URL } from "../CONSTANTS";

const getEventsUrl = (flagName: string) => `${EVENTS_URL}&search=${flagName}`;

export default getEventsUrl;
