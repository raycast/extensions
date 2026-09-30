curl -s -X POST "http://localhost:8765" \
     -H "Content-Type: application/json" \
     -d '{
         "action": "areDue",
         "version": 6,
         "params": {
             "cards": [
             1717293259906
             ]
         }
     }'

