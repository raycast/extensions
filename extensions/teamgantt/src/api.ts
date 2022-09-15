import got from 'got';
import { URL } from 'url';
import { Comment, MyPreferences, Task, TimeBlock } from './types';

export const authenticate = async (preferences: MyPreferences): Promise<{ id_token: string }> => {
  const authorization = Buffer.from(`${preferences.clientId}:${preferences.clientSecret}`).toString('base64');

  return got
    .post('https://auth.teamgantt.com/oauth2/token', {
      headers: {
        Authorization: `Basic ${authorization}`,
      },
      form: {
        grant_type: 'password',
        username: preferences.username,
        password: preferences.password,
      },
    })
    .json();
};

export const findTasks = async (
  { q, today, showCompleted }: { q?: string; today?: boolean; showCompleted?: boolean } = {},
  idToken?: string
) => {
  if (!idToken) {
    throw new Error('not authenticated');
  }

  const url = new URL('https://api.teamgantt.com/v1/tasks');

  if (today) {
    url.searchParams.set('today', '');
  }

  if (q) {
    url.searchParams.set('q', q);
  }

  if (!showCompleted) {
    url.searchParams.set('hide_completed', 'true');
  }

  return got(url.toString(), { headers: { Authorization: `Bearer ${idToken}` } }).json();
};

export const punchIn = async (taskId: number, idToken?: string): Promise<void> => {
  if (!idToken) {
    throw new Error('not authenticated');
  }

  return got
    .post(`https://api.teamgantt.com/v1/times?punch_in`, {
      headers: { Authorization: `Bearer ${idToken}` },
      json: { task_id: taskId },
    })
    .json();
};

export const punchOut = async (timeblockId: number, message?: string, idToken?: string): Promise<void> => {
  if (!idToken) {
    throw new Error('not authenticated');
  }

  return got
    .post(`https://api.teamgantt.com/v1/times?punch_out`, {
      headers: { Authorization: `Bearer ${idToken}` },
      json: { id: timeblockId, message },
    })
    .json();
};

export const getCurrentTimeBlock = (idToken?: string): Promise<TimeBlock> => {
  if (!idToken) {
    throw new Error('not authenticated');
  }
  return got('https://api.teamgantt.com/v1/times?current', { headers: { Authorization: `Bearer ${idToken}` } }).json();
};

export const getComments = async (task: Task, idToken?: string): Promise<Comment[]> => {
  if (!idToken) {
    throw new Error('not authenticated');
  }
  return got(`https://api.teamgantt.com/v1/${task.type}/${task.id}/comments`, {
    headers: { Authorization: `Bearer ${idToken}` },
  }).json();
};
