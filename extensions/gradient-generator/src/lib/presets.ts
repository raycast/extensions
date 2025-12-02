export interface GradientPreset {
  name: string;
  colors: string[];
  description?: string;
}

export const defaultPresets: GradientPreset[] = [
  {
    name: 'Sunset',
    colors: ['#EE7752', '#E73C7E', '#23A6D5'],
    description: 'Warm sunset colors transitioning from orange to pink to blue',
  },
  {
    name: 'Ocean',
    colors: ['#0B486B', '#F56217'],
    description: 'Deep ocean blue to warm orange',
  },
  {
    name: 'Forest',
    colors: ['#5A3F37', '#2C7744'],
    description: 'Rich brown to forest green',
  },
  {
    name: 'Aurora',
    colors: ['#9CECFB', '#65C7F7', '#0052D4'],
    description: 'Northern lights inspired blues',
  },
  {
    name: 'Candy',
    colors: ['#FBD3E9', '#BB377D'],
    description: 'Soft pink to deep magenta',
  },
  {
    name: 'Midnight',
    colors: ['#0F0F23', '#1E1E3F', '#2D2D5F'],
    description: 'Dark midnight blues',
  },
  {
    name: 'Sunrise',
    colors: ['#FF6B6B', '#FFE66D', '#4ECDC4'],
    description: 'Bright sunrise with yellow and teal',
  },
  {
    name: 'Autumn',
    colors: ['#D2691E', '#CD853F', '#F4A460'],
    description: 'Warm autumn earth tones',
  },
  {
    name: 'Spring',
    colors: ['#98FB98', '#90EE90', '#32CD32'],
    description: 'Fresh spring greens',
  },
  {
    name: 'Neon',
    colors: ['#FF1493', '#00FF00', '#00BFFF'],
    description: 'Vibrant neon colors',
  },
  {
    name: 'Pastel',
    colors: ['#FFB6C1', '#DDA0DD', '#87CEEB'],
    description: 'Soft pastel colors',
  },
  {
    name: 'Fire',
    colors: ['#FF4500', '#FF6347', '#FF8C00'],
    description: 'Hot fire oranges and reds',
  },
  {
    name: 'Ice',
    colors: ['#F0F8FF', '#E6E6FA', '#B0E0E6'],
    description: 'Cool ice blues and whites',
  },
  {
    name: 'Desert',
    colors: ['#DEB887', '#F4A460', '#D2B48C'],
    description: 'Warm desert sand tones',
  },
  {
    name: 'Twilight',
    colors: ['#4B0082', '#8A2BE2', '#9370DB'],
    description: 'Deep purple twilight colors',
  },
];

// Function to get presets (can be extended later to include user presets)
export const getPresets = (): GradientPreset[] => {
  // TODO: In future updates, merge with user-defined presets from storage
  return defaultPresets;
};

// Function to add a new preset (for future user customization)
export const addPreset = (preset: GradientPreset): void => {
  // TODO: In future updates, save to user storage
  console.log('Adding preset:', preset);
};

// Function to remove a preset (for future user customization)
export const removePreset = (presetName: string): void => {
  // TODO: In future updates, remove from user storage
  console.log('Removing preset:', presetName);
};
