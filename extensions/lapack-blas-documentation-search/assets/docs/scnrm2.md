```fortran
real(wp) function scnrm2 (
        integer n,
        complex(wp), dimension(*) x,
        integer incx
)
```

SCNRM2 returns the euclidean norm of a vector via the function
name, so that

SCNRM2 := sqrt( x\*\*H\*x )

## Parameters
N : INTEGER [in]
> number of elements in input vector(s)

X : COMPLEX array, dimension (N) [in]
> complex vector with N elements

INCX : INTEGER, storage spacing between elements of X [in]
> If INCX > 0, X(1+(i-1)\*INCX) = x(i) for 1 <= i <= n
> If INCX < 0, X(1-(n-i)\*INCX) = x(i) for 1 <= i <= n
> If INCX = 0, x isn't a vector so there is no need to call
> this subroutine.  If you call it anyway, it will count x(1)
> in the vector norm N times.
