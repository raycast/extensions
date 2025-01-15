const sharp = require('sharp');

sharp('icon.png')
	.resize(512, 512, {
		fit: 'fill',
	})
	.png()
	.toFile('assets/icon.png')
	.then(() => console.log('Icon resized to 512x512'))
	.catch((err) => console.error('Error:', err));
