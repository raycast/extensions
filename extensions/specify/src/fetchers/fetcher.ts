import axios from 'axios';

export const createSpecifyApiAxiosInstance = (personalAccessToken?: string) => {
  const headers = {
    ...(personalAccessToken ? { Authorization: personalAccessToken } : {}),
    'Content-Type': 'application/json',
    'x-raycast-api-version': '1.0.0',
  };

  const axiosInstance = axios.create({
    baseURL: 'https://api.specifyapp.com',
    headers,
  });

  return axiosInstance;
};
