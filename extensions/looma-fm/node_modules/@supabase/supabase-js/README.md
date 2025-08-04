# `supabase-js` - Isomorphic JavaScript Client for Supabase.

- **Documentation:** https://supabase.com/docs/reference/javascript/start
- TypeDoc: https://supabase.github.io/supabase-js/v2/

## Usage

First of all, you need to install the library:

```sh
npm install @supabase/supabase-js
```

Then you're able to import the library and establish the connection with the database:

```js
import { createClient } from '@supabase/supabase-js'

// Create a single supabase client for interacting with your database
const supabase = createClient('https://xyzcompany.supabase.co', 'public-anon-key')
```

### UMD

You can use plain `<script>`s to import supabase-js from CDNs, like:

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
```

or even:

```html
<script src="https://unpkg.com/@supabase/supabase-js@2"></script>
```

Then you can use it from a global `supabase` variable:

```html
<script>
  const { createClient } = supabase
  const _supabase = createClient('https://xyzcompany.supabase.co', 'public-anon-key')

  console.log('Supabase Instance: ', _supabase)
  // ...
</script>
```

### ESM

You can use `<script type="module">` to import supabase-js from CDNs, like:

```html
<script type="module">
  import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'
  const supabase = createClient('https://xyzcompany.supabase.co', 'public-anon-key')

  console.log('Supabase Instance: ', supabase)
  // ...
</script>
```

### Deno

You can use supabase-js in the Deno runtime via [JSR](https://jsr.io/@supabase/supabase-js):

```js
import { createClient } from 'jsr:@supabase/supabase-js@2'
```

### Custom `fetch` implementation

`supabase-js` uses the [`cross-fetch`](https://www.npmjs.com/package/cross-fetch) library to make HTTP requests, but an alternative `fetch` implementation can be provided as an option. This is most useful in environments where `cross-fetch` is not compatible, for instance Cloudflare Workers:

```js
import { createClient } from '@supabase/supabase-js'

// Provide a custom `fetch` implementation as an option
const supabase = createClient('https://xyzcompany.supabase.co', 'public-anon-key', {
  global: {
    fetch: (...args) => fetch(...args),
  },
})
```

## Support Policy

This section outlines the scope of support for various runtime environments in Supabase JavaScript client.

### Node.js

We only support Node.js versions that are in **Active LTS** or **Maintenance** status as defined by the [official Node.js release schedule](https://nodejs.org/en/about/previous-releases#release-schedule). This means we support versions that are currently receiving long-term support and critical bug fixes.

When a Node.js version reaches end-of-life and is no longer in Active LTS or Maintenance status, Supabase will drop it in a **minor release**, and **this won't be considered a breaking change**.

### Deno

We support Deno versions that are currently receiving active development and security updates. We follow the [official Deno release schedule](https://docs.deno.com/runtime/fundamentals/stability_and_releases/) and only support versions from the `stable` and `lts` release channels.

When a Deno version reaches end-of-life and is no longer receiving security updates, Supabase will drop it in a **minor release**, and **this won't be considered a breaking change**.

### Important Notes

- **Experimental features**: Features marked as experimental may be removed or changed without notice

## Testing

### Unit Testing

```bash
pnpm test
```

### Integration Testing

```bash
supabase start
pnpm run test:integration
```

### Expo Testing

The project includes Expo integration tests to ensure compatibility with React Native environments.

### Next.js Testing

The project includes Next.js integration tests to ensure compatibility with React SSR environments.

### Deno Testing

The project includes Deno integration tests to ensure compatibility with Deno runtime.

### Bun Testing

The project includes Bun integration tests to ensure compatibility with Bun runtime.

#### CI/CD Testing

When running on CI, the tests automatically use the latest dependencies from the root project. The CI pipeline:

1. Builds the main project with current dependencies
2. Creates a package archive (`.tgz`) with the latest versions
3. Uses this archive in Expo, Next.js, and Deno tests to ensure consistency

#### Local Development

For local development of Expo, Next.js, and Deno tests, you can update dependencies using automated scripts:

```bash
# Update all test dependencies at once
npm run update:test-deps

# Or update specific test environments:
npm run update:test-deps:expo    # Expo tests only
npm run update:test-deps:next    # Next.js tests only
npm run update:test-deps:deno    # Deno tests only
npm run update:test-deps:bun     # Bun tests only
```

**Note:** The CI automatically handles dependency synchronization, so manual updates are only needed for local development and testing.

## Badges

[![Coverage Status](https://coveralls.io/repos/github/supabase/supabase-js/badge.svg?branch=master)](https://coveralls.io/github/supabase/supabase-js?branch=master)
