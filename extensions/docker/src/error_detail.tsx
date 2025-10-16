import { Action, ActionPanel, Application, Detail, getApplications } from '@raycast/api';
import { useEffect, useState } from 'react';
import { isConnrefusedError } from './docker/error';

export default function ErrorDetail({ error }: { error: Error }) {
  const [applications, setApplications] = useState<Application[]>([]);

  useEffect(() => {
    async function fetchApplications() {
      const applications = await getApplications();
      setApplications(applications);
    }
    fetchApplications();
  }, []);

  const dockerInstallation = applications.find(({ bundleId }) => bundleId === 'com.docker.docker');

  return (
    <Detail
      markdown={errorMessage(error)}
      actions={
        isConnrefusedError(error) && dockerInstallation !== undefined ? (
          <ActionPanel>
            <Action.Open title="Launch Docker" target={dockerInstallation.path} />
          </ActionPanel>
        ) : null
      }
    />
  );
}

const errorMessage = (error: Error) => {
  const errorDetails = 'Error message:' + '\n\n```\n' + error.message + '\n```';

  if (isConnrefusedError(error)) {
    return ['## ⚠️ Error connecting to Docker', errorDetails].join('\n');
  }

  return `## An Error Occurred:\n\n${errorDetails}`;
};
