```fortran
real function slapy2 (
        real x,
        real y
)
```

SLAPY2 returns sqrt(x\*\*2+y\*\*2), taking care not to cause unnecessary
overflow and unnecessary underflow.

## Parameters
X : REAL [in]

Y : REAL [in]
> X and Y specify the values x and y.
