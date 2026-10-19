import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hostnameOf, initials, serviceDomain, serviceName } from '../src/services';
import { truncateEnd, truncateMiddle } from '../src/code-tile';

test('service names are cleaned from hosts and URLs', () => {
  const cases: Array<[string, string]> = [
    ['www.google.coms/fsdfsdf', 'Google'],
    ['accounts.google.com', 'Google'],
    ['https://github.com/settings/security', 'GitHub'],
    ['signin.aws.amazon.com', 'AWS'],
    ['aws', 'AWS'],
    ['Google Account', 'Google'],
    ['https://www.example.co.uk/login', 'Example'],
    ['my-company.io', 'My Company'],
    ['xyz.com', 'XYZ'],
    ['crypto.com', 'Crypto.com'],
    ['  Acme Corp  ', 'Acme Corp'],
  ];
  for (const [input, expected] of cases) assert.equal(serviceName(input), expected, input);
});

test('only web hosts are treated as addresses', () => {
  assert.equal(hostnameOf('Acme Corp'), undefined);
  assert.equal(hostnameOf('ftp://files.example.com'), undefined);
  assert.equal(hostnameOf('192.168.1.1'), undefined);
  assert.equal(hostnameOf('WWW.Example.com:8443/x'), 'example.com');
});

test('logo domains come from known services, hosts, or single-word brands', () => {
  assert.equal(serviceDomain('GitHub'), 'github.com');
  assert.equal(serviceDomain('Amazon Web Services'), 'aws.amazon.com');
  assert.equal(serviceDomain('id.atlassian.com'), 'atlassian.com');
  assert.equal(serviceDomain('portal.example.co.uk'), 'example.co.uk');
  assert.equal(serviceDomain('Plausible'), 'plausible.com');
  assert.equal(serviceDomain('Acme Corp'), undefined);
  assert.equal(serviceDomain(undefined), undefined);
});

test('initials stand in for missing logos', () => {
  const cases: Array<[string, string]> = [
    ['American Express', 'AE'],
    ['Plausible', 'PL'],
    ['hello@omninexus.io', 'HE'],
    ['my-company', 'MC'],
    ['X', 'X'],
    ['Ünïcode', 'ÜN'],
    ['  ', ''],
  ];
  for (const [input, expected] of cases) assert.equal(initials(input), expected, input);
});

test('grid tiles shorten long names on one line', () => {
  assert.equal(truncateMiddle('sdffsdfsdfsdfdsfsd@gmail.com', 24), 'sdffsdfsdfsdf…@gmail.com');
  assert.equal(truncateMiddle('short@example.com', 24), 'short@example.com');
  assert.equal(truncateMiddle('averyveryverylongusername', 11), 'avery…rname');
  assert.equal(truncateMiddle('a@averyveryverylongdomain.example.com', 15), 'a@avery…ple.com');
  assert.equal(truncateEnd('A Very Long Service Name', 12), 'A Very Long…');
});
