import { getPreferenceValues } from '@raycast/api';
import axios from 'axios';
import { Agent } from 'node:http';

const { port } = getPreferenceValues<Preferences>();

const apiClient = axios.create({
  baseURL: `http://127.0.0.1:${port ? port : 8765}/`,
  timeout: 2000,
  // AnkiConnect closes each connection without advertising Connection: close.
  httpAgent: new Agent({ keepAlive: false }),
});

export default apiClient;
