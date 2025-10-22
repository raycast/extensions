export type Volume = {
  id: string;
  name: string;
  path: string;
  format: 'APFS' | 'FAT' | 'ExFAT';
  size: string;
};
