import { Action, ActionPanel, List, LocalStorage, environment } from '@raycast/api'
import { chmod } from 'fs/promises';
import aperture from 'aperture';
import { join } from 'path';

export default function StartRecordingCommand() {
  const handleSelect = async () => {
    await chmod(join(environment.assetsPath, 'aperture'), 755);
    
    const recorder = aperture();
    const pid = await recorder.startRecording() as unknown as string;
    console.log('Recording started');
    const filePath = await recorder.isFileReady;
    console.log('File is ready');
    console.log({pid});
    await LocalStorage.setItem('aperture-processId', pid);
    if (filePath) await LocalStorage.setItem('aperture-filePath', filePath);
  }
  
  return (
    <List>
      <List.Item title="Entire Screen" id='entire-screen' actions={<ActionPanel>
        <Action title="Start Recording" onAction={handleSelect} />
      </ActionPanel>} />
    </List>
  )
}