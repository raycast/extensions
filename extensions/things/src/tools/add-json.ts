import { addJson } from '../api';

type Input = {
  /**
   * A JSON string containing an array of Things JSON objects.
   * This is the ONLY tool that supports creating projects with headings and nested to-dos in one call.
   * Tags must be arrays of strings, NOT comma-separated strings.
   * Example: '[{"type":"project","attributes":{"title":"My Project","items":[{"type":"to-do","attributes":{"title":"Task 1"}}]}}]'
   */
  jsonData: string;
};

export default async function ({ jsonData }: Input) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonData);
  } catch {
    throw new Error('jsonData must be valid JSON.');
  }
  if (!Array.isArray(parsed)) {
    throw new Error('jsonData must be a JSON array.');
  }
  try {
    await addJson(parsed);
    return { success: true };
  } catch (error) {
    if (error instanceof Error && error.message === 'unauthorized') {
      return {
        error: 'No token provided',
        message:
          'Add your Things token in the extension settings. You can find your unique token in Things settings. go to Things → Settings → General → Enable Things URLs → Manage',
      };
    }
    throw error;
  }
}
