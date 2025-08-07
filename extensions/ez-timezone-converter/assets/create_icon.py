import struct

def create_simple_png(width, height, filename):
    # Create a simple PNG file
    def write_png_chunk(f, chunk_type, data):
        f.write(struct.pack('>I', len(data)))
        f.write(chunk_type)
        f.write(data)
        crc = 0xFFFFFFFF
        for byte in chunk_type + data:
            crc ^= byte
            for _ in range(8):
                if crc & 1:
                    crc = (crc >> 1) ^ 0xEDB88320
                else:
                    crc >>= 1
        f.write(struct.pack('>I', crc ^ 0xFFFFFFFF))

    with open(filename, 'wb') as f:
        # PNG signature
        f.write(b'\x89PNG\r\n\x1a\n')
        
        # IHDR chunk
        ihdr_data = struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0)
        write_png_chunk(f, b'IHDR', ihdr_data)
        
        # Simple blue image data
        image_data = b''
        for y in range(height):
            image_data += b'\x00'  # Filter type
            for x in range(width):
                # Blue pixel (RGB)
                image_data += b'\x4A\x90\xE2'
        
        # Compress the image data
        import zlib
        compressed_data = zlib.compress(image_data)
        write_png_chunk(f, b'IDAT', compressed_data)
        
        # IEND chunk
        write_png_chunk(f, b'IEND', b'')

create_simple_png(512, 512, '🌍')
print("Icon created successfully")
