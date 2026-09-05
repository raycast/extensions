import { buildAgentEnvironment, buildAgentPath } from '@/utils/agentEnvironment';

describe('buildAgentPath', () => {
  it('keeps inherited entries in front and appends the configured ones', () => {
    const result = buildAgentPath('/inherited/bin', ['/configured/bin']).split(':');

    expect(result.indexOf('/inherited/bin')).toBe(0);
    expect(result.indexOf('/configured/bin')).toBe(1);
  });

  it('always adds the system locations, after everything else', () => {
    const result = buildAgentPath('/inherited/bin', ['/configured/bin']).split(':');

    expect(result).toContain('/usr/bin');
    expect(result.indexOf('/usr/bin')).toBeGreaterThan(result.indexOf('/configured/bin'));
  });

  it('falls back to the system locations when Raycast passes an empty PATH', () => {
    // Raycast runs extensions with no usable PATH; the agent still has to find
    // /usr/bin/security, /bin/sh and friends.
    const result = buildAgentPath('', ['/configured/bin']).split(':');

    expect(result).toEqual(expect.arrayContaining(['/configured/bin', '/usr/bin', '/bin']));
  });

  it('does not duplicate entries', () => {
    const result = buildAgentPath('/usr/bin:/configured/bin', ['/configured/bin']).split(':');

    expect(result.filter((segment) => segment === '/configured/bin')).toHaveLength(1);
    expect(result.filter((segment) => segment === '/usr/bin')).toHaveLength(1);
  });
});

describe('buildAgentEnvironment', () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
  });

  it('fills in the user identity Raycast omits', () => {
    // Without USER the Claude CLI cannot look up its keychain credentials and
    // reports "not logged in", even though the user is signed in.
    process.env = { HOME: '/Users/someone', PATH: '' };

    const env = buildAgentEnvironment({ environmentVariables: {}, appendToPath: [] });

    expect(env.USER).toBeTruthy();
    expect(env.LOGNAME).toBe(env.USER);
  });

  it('keeps an inherited user identity untouched', () => {
    process.env = { USER: 'inherited', LOGNAME: 'inherited', PATH: '/usr/bin' };

    const env = buildAgentEnvironment({ environmentVariables: {}, appendToPath: [] });

    expect(env.USER).toBe('inherited');
  });

  it('lets configured environment variables win', () => {
    process.env = { PATH: '/usr/bin', SOME_TOKEN: 'inherited' };

    const env = buildAgentEnvironment({
      environmentVariables: { SOME_TOKEN: 'configured' },
      appendToPath: [],
    });

    expect(env.SOME_TOKEN).toBe('configured');
  });

  it('exposes the resolved PATH under every casing', () => {
    process.env = { PATH: '' };

    const env = buildAgentEnvironment({ environmentVariables: {}, appendToPath: ['/configured/bin'] });

    expect(env.Path).toBe(env.PATH);
    expect(env.path).toBe(env.PATH);
  });
});
