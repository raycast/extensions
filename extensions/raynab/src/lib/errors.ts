import { showToast, Toast } from '@raycast/api';
import type { ErrorResponse } from 'ynab';

export function isYnabError(error: unknown): error is ErrorResponse {
  return (error as ErrorResponse).error !== undefined;
}

export function displayError(error: ErrorResponse, title?: string) {
  const { error: apiError } = error;
  if (apiError.id === '400') {
    console.error(apiError);
    throw new Error('Malformed request to the API');
  }

  const errorMessage = ErrorTable.get(apiError.id);
  showToast({ style: Toast.Style.Failure, title: title ?? apiError.name, message: errorMessage ?? apiError.detail });
  console.error(apiError, title);
}

const ErrorTable = new Map([
  ['401', 'Please verify your API token is valid.'],
  ['403.1', 'The subscription for your account has lapsed.'],
  ['403.2', 'Your YNAB Trial has expired.'],
  ['409', 'There was a conflict when trying to process this request.'],
  ['429', 'You have reached the request limit for the API. Try again in'],
  ['500', 'Something went wrong internally with YNAB.'],
  ['503', 'The YNAB API is disabled for maintenance. Try again later.'],
]);
