```fortran
real function scsum1 (
        integer n,
        complex, dimension( * ) cx,
        integer incx
)
```

SCSUM1 takes the sum of the absolute values of a complex
vector and returns a single precision result.

Based on SCASUM from the Level 1 BLAS.
The change is to use the 'genuine' absolute value.

## Parameters
N : INTEGER [in]
> The number of elements in the vector CX.

CX : COMPLEX array, dimension (N) [in]
> The vector whose elements will be summed.

INCX : INTEGER [in]
> The spacing between successive values of CX.  INCX > 0.
