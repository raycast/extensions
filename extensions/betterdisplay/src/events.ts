import { EventEmitter } from "events";

// Use a default export for the singleton EventEmitter.
const events = new EventEmitter();
export default events;
