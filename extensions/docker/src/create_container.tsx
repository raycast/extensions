import { useState, useCallback, useMemo } from 'react';
import { ActionPanel, Action, Form } from '@raycast/api';
import { useDocker } from './docker';
import { useDockerode } from './docker/dockerode';
import { ContainerCreateOptions } from '@priithaamer/dockerode';
import { withToast } from './ui/toast';

interface Props {
  imageId: string;
}

type FormValues = {
  name: string;
  port: string;
  volume: string;
  env: string;
};

export default function CreateContainer({ imageId }: Props) {
  const docker = useDockerode();
  const { useImageInfo, useCreateContainer } = useDocker(docker);
  const { imageInfo, isLoading } = useImageInfo({ Id: imageId });

  const { createContainer } = useCreateContainer();

  const [formValues, setFormValues] = useState<FormValues>({
    name: '',
    port: '',
    volume: '',
    env: '',
  });

  const handleInputChange = useCallback((key: keyof FormValues, value: string) => {
    setFormValues((prevValues) => ({
      ...prevValues,
      [key]: value,
    }));
  }, []);

  const ContainerPorts = useMemo(() => Object.keys(imageInfo?.Config?.ExposedPorts || {}), [imageInfo]);

  const handleFormSubmit = useCallback(
    (values: FormValues) => {
      const { name, port, volume, env } = values;
      const splitValues = (value: string) => value.split(',');

      const createPortBindings = (hostPorts: string[]) => {
        return ContainerPorts.slice(0, hostPorts.length).reduce((bindings, containerPort, index) => {
          return {
            ...bindings,
            [containerPort]: [
              {
                HostPort: hostPorts[index],
              },
            ],
          };
        }, {});
      };

      const options: ContainerCreateOptions = {
        Image: imageInfo?.RepoTags[0],
        name,
        HostConfig: {
          PortBindings: port ? createPortBindings(splitValues(port)) : createPortBindings(ContainerPorts),
          Binds: volume ? splitValues(volume) : undefined,
        },
        Env: env ? splitValues(env) : undefined,
      };

      withToast({
        action: () => createContainer(options),
        onStart: () => 'Container Creation',
        onSuccess: () => ['Container Creation', 'The container was created successfully!'],
        onFailure: (error: Error) => ['Container Creation Failed', error.message],
      })();

      // Clear form values
      setFormValues({
        name: '',
        port: '',
        volume: '',
        env: '',
      });
    },
    [createContainer, imageInfo?.RepoTags],
  );
  const portFields = useMemo(() => {
    return (
      <Form.TextField
        title="Port"
        id="port"
        placeholder={ContainerPorts.join(',')}
        info="default ports are used if no ports are provided"
        value={formValues.port}
        onChange={(value) => handleInputChange('port', value)}
      />
    );
  }, [imageInfo, handleInputChange, formValues.port]);

  return (
    <Form
      isLoading={isLoading}
      navigationTitle={`${imageInfo?.RepoTags[0]}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleFormSubmit} />
        </ActionPanel>
      }
    >
      {portFields}
      <Form.TextField
        title="Name"
        id="name"
        placeholder="Container name"
        info="If no name is provided, a random name will be generated"
        value={formValues.name}
        autoFocus
        onChange={(value) => handleInputChange('name', value)}
      />
      <Form.TextField
        title="Volume"
        id="volume"
        placeholder="/data:/data"
        info='multiple volumes can be separated by ","'
        value={formValues.volume}
        onChange={(value) => handleInputChange('volume', value)}
      />
      <Form.TextField
        title="Env"
        id="env"
        placeholder="key=value"
        info='multiple env variables can be separated by ","'
        value={formValues.env}
        onChange={(value) => handleInputChange('env', value)}
      />
    </Form>
  );
}
