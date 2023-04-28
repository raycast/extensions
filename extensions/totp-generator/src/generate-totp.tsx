import { Form, Detail, ActionPanel, Action, Icon, showToast, Toast } from '@raycast/api';
import { useEffect, useState } from 'react';
import * as OTPAuth from 'otpauth';

function getCurrentSeconds() {
  return Math.round(new Date().getTime() / 1000);
}

function generateToken(period: number, digits: number, secret: string) {
  if (!secret) return '';
  try {
    const totp = new OTPAuth.TOTP({
      algorithm: 'SHA1',
      digits,
      period,
      secret: OTPAuth.Secret.fromBase32(secret.replace(/\s/g, '')),
    });

    const token = totp.generate();
    return token;
  } catch (err) {
    if (err instanceof Error) {
      showToast({
        style: Toast.Style.Failure,
        title: err.message,
      });
    }

    return '';
  }
}

export default () => {
  const [secret, setSecret] = useState('');
  const [digits, setDigits] = useState('6');
  const [tokenPeriod, setTokenPeriod] = useState('30');
  const [token, setToken] = useState('');

  function update() {
    setToken(generateToken(+tokenPeriod, +digits, secret));
  }

  useEffect(() => {
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.Push
            title="View"
            target={<Details secret={secret} digits={digits} tokenPeriod={tokenPeriod} />}
          ></Action.Push>
          <Action.CopyToClipboard title="Copy To Clipboard" content={token}></Action.CopyToClipboard>
        </ActionPanel>
      }
    >
      <Form.TextField
        id="secret"
        title="Secret Key"
        placeholder="The secret key (in base32 format)"
        value={secret}
        onChange={setSecret}
      />
      <Form.TextField
        id="digits"
        title="Number of Digits"
        placeholder="Usually 6"
        value={digits}
        onChange={setDigits}
      />
      <Form.TextField
        id="tokenPeriod"
        title="Token Period (in seconds)"
        placeholder="Usually 30"
        value={tokenPeriod}
        onChange={setTokenPeriod}
      />
    </Form>
  );
};

type DetailsProps = {
  secret: string;
  digits: string;
  tokenPeriod: string;
};

function Details({ secret, digits, tokenPeriod }: DetailsProps) {
  const [token, setToken] = useState('');
  const [tokenExpiresIn, setTokenExpiresIn] = useState(0);
  const [progressIcon, setProgressIcon] = useState(Icon.CircleProgress100);

  const icons = [Icon.CircleProgress100, Icon.CircleProgress75, Icon.CircleProgress50, Icon.CircleProgress25];

  function update() {
    const period = +tokenPeriod;
    setToken(generateToken(period, +digits, secret));
    const expiresIn = period - (getCurrentSeconds() % period);
    setTokenExpiresIn(expiresIn);
    const percentage = (expiresIn / period) * 100;
    const index = icons.findIndex((_, i) => percentage > 100 - (i + 1) * 25);
    setProgressIcon(icons.at(index) as Icon);
  }

  useEffect(() => {
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  });
  return (
    <Detail
      markdown={`# ${token.replace(/(.{3})/g, '$1 ').trim()}`}
      navigationTitle="One-Time Password"
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Secret Key" text={secret.toUpperCase()} />
          <Detail.Metadata.Label title="Updating in" text={`${tokenExpiresIn}s`} icon={progressIcon} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy To Clipboard" content={token}></Action.CopyToClipboard>
        </ActionPanel>
      }
    />
  );
}
