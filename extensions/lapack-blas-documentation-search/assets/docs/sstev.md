```fortran
subroutine sstev (
        character jobz,
        integer n,
        real, dimension( * ) d,
        real, dimension( * ) e,
        real, dimension( ldz, * ) z,
        integer ldz,
        real, dimension( * ) work,
        integer info
)
```

SSTEV computes all eigenvalues and, optionally, eigenvectors of a
real symmetric tridiagonal matrix A.

## Parameters
JOBZ : CHARACTER\*1 [in]
> = 'N':  Compute eigenvalues only;
> = 'V':  Compute eigenvalues and eigenvectors.

N : INTEGER [in]
> The order of the matrix.  N >= 0.

D : REAL array, dimension (N) [in,out]
> On entry, the n diagonal elements of the tridiagonal matrix
> A.
> On exit, if INFO = 0, the eigenvalues in ascending order.

E : REAL array, dimension (N-1) [in,out]
> On entry, the (n-1) subdiagonal elements of the tridiagonal
> matrix A, stored in elements 1 to N-1 of E.
> On exit, the contents of E are destroyed.

Z : REAL array, dimension (LDZ, N) [out]
> If JOBZ = 'V', then if INFO = 0, Z contains the orthonormal
> eigenvectors of the matrix A, with the i-th column of Z
> holding the eigenvector associated with D(i).
> If JOBZ = 'N', then Z is not referenced.

LDZ : INTEGER [in]
> The leading dimension of the array Z.  LDZ >= 1, and if
> JOBZ = 'V', LDZ >= max(1,N).

WORK : REAL array, dimension (max(1,2\*N-2)) [out]
> If JOBZ = 'N', WORK is not referenced.

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value
> > 0:  if INFO = i, the algorithm failed to converge; i
> off-diagonal elements of E did not converge to zero.
