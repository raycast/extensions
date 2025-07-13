import { getPreferenceValues } from '@raycast/api';
import axios from 'axios';

const { port } = getPreferenceValues<Preferences>();

const apiClient = axios.create({
  baseURL: `http://127.0.0.1:${port ? port : 8765}/`,
  timeout: 2000,
});

export default apiClient;
