import { CONSOLE_URL } from '../../constants'

export const getVolumeUrl = () => `${CONSOLE_URL}/block-storage/volumes`

// update when it's will be available
// export const getVolumeUrl = (volume: Block.v1alpha1.Volume) =>
//   `${CONSOLE_URL}/block-storage/volumes/${volume.zone}/${volume.id}/overview`
