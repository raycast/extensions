curl -X POST "http://localhost:8765" \
     -H "Content-Type: application/json" \
     -d '{
         "action": "modelNames",
         "version": 6
     }'
