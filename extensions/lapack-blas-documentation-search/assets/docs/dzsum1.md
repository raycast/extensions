```fortran
double precision function dzsum1 (
        integer n,
        complex*16, dimension( * ) cx,
        integer incx
)
```

DZSUM1 takes the sum of the absolute values of a complex
vector and returns a double precision result.

Based on DZASUM from the Level 1 BLAS.
The change is to use the 'genuine' absolute value.

## Parameters
N : INTEGER [in]
> The number of elements in the vector CX.

CX : COMPLEX\*16 array, dimension (N) [in]
> The vector whose elements will be summed.

INCX : INTEGER [in]
> The spacing between successive values of CX.  INCX > 0.
