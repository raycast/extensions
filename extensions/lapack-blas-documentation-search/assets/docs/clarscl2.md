```fortran
subroutine clarscl2 (
        integer m,
        integer n,
        real, dimension( * ) d,
        complex, dimension( ldx, * ) x,
        integer ldx
)
```

CLARSCL2 performs a reciprocal diagonal scaling on a matrix:
x <-- inv(D) \* x
where the REAL diagonal matrix D is stored as a vector.

Eventually to be replaced by BLAS_cge_diag_scale in the new BLAS
standard.

## Parameters
M : INTEGER [in]
> The number of rows of D and X. M >= 0.

N : INTEGER [in]
> The number of columns of X. N >= 0.

D : REAL array, length M [in]
> Diagonal matrix D, stored as a vector of length M.

X : COMPLEX array, dimension (LDX,N) [in,out]
> On entry, the matrix X to be scaled by D.
> On exit, the scaled matrix.

LDX : INTEGER [in]
> The leading dimension of the matrix X. LDX >= M.
