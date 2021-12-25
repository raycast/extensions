import child_process from "child_process";
import fs from "fs";
import { ActionPanel, environment, Form, Icon, List, preferences, PushAction, SubmitFormAction, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import { promisify } from "util"

interface IAudioDevice {
  id: number;
  name: string;
  type: string;
  isDefault: boolean;
  alias?: string;
}

const exec = promisify(child_process.exec);
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

const AudioDevicesFilePath = `${environment.supportPath}/audio_devices.json`;

export default function Command() {
  const utility = preferences.utility.value as string;

  const [outputAudioDevices, setOutputAudioDevices] = useState<IAudioDevice[]>([]);

  useEffect(() => {
    GetOutputAudioDevices();
  }, []);

  async function GetOutputAudioDevices() {
    // get list of output audio devices
    let utilityOutput = await exec(`${utility} --list-output`);
    let audioDevices = JSON.parse(utilityOutput.stdout) as IAudioDevice[];

    try {
      // load audio devices from file
      let savedAudioDevices = await LoadAudioDevicesFromFile();

      // fill aliases for saved audio devices
      for (let savedAudioDevice of savedAudioDevices) {
        let audioDevice = audioDevices.filter(audioDevice => audioDevice.id == savedAudioDevice.id)?.[0];
        if (!savedAudioDevice) {
          continue;
        }

        audioDevice.alias = savedAudioDevice.alias;
      }
    } catch (error) {
      // do nothing
    }

    // display output audio devices
    setOutputAudioDevices(audioDevices);
  };

  async function LoadAudioDevicesFromFile(): Promise<IAudioDevice[]> {
    return new Promise<IAudioDevice[]>(async (resolve) => {
      let audioDevices = [] as IAudioDevice[];

      try {
        // load data from file
        let savedData = await readFile(AudioDevicesFilePath, "utf8");

        // parse the data to audio devices
        audioDevices = JSON.parse(savedData) as IAudioDevice[];
      } catch (error) {
        // do nothing
      }

      // return audio devices
      return resolve(audioDevices);
    });
  }

  async function SwitchToOutputDevice(audioDevice: IAudioDevice): Promise<void> {
    // switch to output device
    await exec(`${utility} --set-output=${audioDevice.id}`);

    // refresh the data
    GetOutputAudioDevices();
  }

  function Home() {
    return (
      <List>
        {outputAudioDevices.map((audioDevice) => (
          <List.Item
            key={audioDevice.id}
            icon={audioDevice.isDefault ? Icon.Checkmark : Icon.Circle}
            title={audioDevice.alias ?? audioDevice.name}
            actions={
              <ActionPanel>
                  <ActionPanel.Item
                    title="Select"
                    onAction={() => SwitchToOutputDevice(audioDevice)} />
                  <PushAction
                    title="Rename"
                    target={<EditAlias audioDevice={audioDevice} />} />
              </ActionPanel>
            } />
        ))}
      </List>
    );
  }

  async function SaveAlias(audioDevice: IAudioDevice): Promise<void> {
    // load audio devices from file
    let savedAudioDevices = await LoadAudioDevicesFromFile();

    // check if there is already saved audio device
    let savedAudioDevice = savedAudioDevices.filter(savedAudioDevice => savedAudioDevice.id === audioDevice.id)?.[0];

    // if there is already saved audio device
    savedAudioDevice
      // then replace alias with new one
      ? savedAudioDevice.alias = (!audioDevice.alias?.length) ? undefined : audioDevice.alias
      // else add device to the array for saving
      : savedAudioDevices.push(audioDevice);

    // save the data
    const dataToSave = JSON.stringify(savedAudioDevices);
    await writeFile(AudioDevicesFilePath, dataToSave);

    // refresh the data
    GetOutputAudioDevices();
  }

  function EditAlias(properties: { audioDevice: IAudioDevice }) {
    const { pop } = useNavigation();

    return (
      <Form
        actions={
          <ActionPanel>
            <SubmitFormAction
              title="Save alias"
              onSubmit={() => { SaveAlias(properties.audioDevice); pop(); }} />
          </ActionPanel>
        }>
        <Form.TextField
          id={properties.audioDevice.name}
          title="Alias"
          value={properties.audioDevice.alias}
          placeholder={properties.audioDevice.name}
          onChange={(alias) => properties.audioDevice.alias = alias} />
      </Form>
    );
  }

  return Home();
}
