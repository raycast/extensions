import { describe, expect, it } from 'vitest';
import { createClient } from './client.js';
import { ApiError } from './errors.js';

// `.json()` on a Response consumes the body stream even when JSON parsing
// fails, so a `.text()` fallback on the same Response throws "Body is
// unusable" and the error payload gets lost. Reading text first and
// JSON.parsing from the string preserves both shapes.
describe('createClient error middleware', () => {
    const makeFetch =
        (status: number, body: string, contentType: string): typeof fetch =>
        async () =>
            new Response(body, {
                status,
                statusText: 'Bad Request',
                headers: { 'content-type': contentType },
            });

    it('preserves plain-text error bodies on non-2xx responses', async () => {
        const client = createClient({
            baseUrl: 'https://api.example.com',
            auth: { kind: 'apiKey', key: 'test' },
            fetch: makeFetch(400, 'plain failure', 'text/plain'),
        });
        await expect(client.GET('/companies')).rejects.toMatchObject({
            name: 'ApiError',
            status: 400,
            body: 'plain failure',
        });
    });

    it('parses JSON error bodies on non-2xx responses', async () => {
        const client = createClient({
            baseUrl: 'https://api.example.com',
            auth: { kind: 'apiKey', key: 'test' },
            fetch: makeFetch(400, '{"error":"bad input"}', 'application/json'),
        });
        await expect(client.GET('/companies')).rejects.toMatchObject({
            name: 'ApiError',
            status: 400,
            body: { error: 'bad input' },
        });
    });

    it('leaves body null when the response body is empty', async () => {
        const client = createClient({
            baseUrl: 'https://api.example.com',
            auth: { kind: 'apiKey', key: 'test' },
            fetch: makeFetch(500, '', 'text/plain'),
        });
        let caught: unknown;
        try {
            await client.GET('/companies');
        } catch (err) {
            caught = err;
        }
        expect(caught).toBeInstanceOf(ApiError);
        expect((caught as ApiError).body).toBeNull();
    });
});