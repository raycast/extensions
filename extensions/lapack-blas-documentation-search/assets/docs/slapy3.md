```fortran
real function slapy3 (
        real x,
        real y,
        real z
)
```

SLAPY3 returns sqrt(x\*\*2+y\*\*2+z\*\*2), taking care not to cause
unnecessary overflow and unnecessary underflow.

## Parameters
X : REAL [in]

Y : REAL [in]

Z : REAL [in]
> X, Y and Z specify the values x, y and z.
