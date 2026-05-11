```fortran
subroutine slascl2 (
        integer m,
        integer n,
        real, dimension( * ) d,
        real, dimension( ldx, * ) x,
        integer ldx
)
```

SLASCL2 performs a diagonal scaling on a matrix:
x <-- D \* x
where the diagonal matrix D is stored as a vector.

Eventually to be replaced by BLAS_sge_diag_scale in the new BLAS
standard.

## Parameters
M : INTEGER [in]
> The number of rows of D and X. M >= 0.

N : INTEGER [in]
> The number of columns of X. N >= 0.

D : REAL array, length M [in]
> Diagonal matrix D, stored as a vector of length M.

X : REAL array, dimension (LDX,N) [in,out]
> On entry, the matrix X to be scaled by D.
> On exit, the scaled matrix.

LDX : INTEGER [in]
> The leading dimension of the matrix X. LDX >= M.
