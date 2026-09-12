```fortran
subroutine dlaed0 (
        integer icompq,
        integer qsiz,
        integer n,
        double precision, dimension( * ) d,
        double precision, dimension( * ) e,
        double precision, dimension( ldq, * ) q,
        integer ldq,
        double precision, dimension( ldqs, * ) qstore,
        integer ldqs,
        double precision, dimension( * ) work,
        integer, dimension( * ) iwork,
        integer info
)
```

DLAED0 computes all eigenvalues and corresponding eigenvectors of a
symmetric tridiagonal matrix using the divide and conquer method.

## Parameters
ICOMPQ : INTEGER [in]
> = 0:  Compute eigenvalues only.
> = 1:  Compute eigenvectors of original dense symmetric matrix
> also.  On entry, Q contains the orthogonal matrix used
> to reduce the original matrix to tridiagonal form.
> = 2:  Compute eigenvalues and eigenvectors of tridiagonal
> matrix.

QSIZ : INTEGER [in]
> The dimension of the orthogonal matrix used to reduce
> the full matrix to tridiagonal form.  QSIZ >= N if ICOMPQ = 1.

N : INTEGER [in]
> The dimension of the symmetric tridiagonal matrix.  N >= 0.

D : DOUBLE PRECISION array, dimension (N) [in,out]
> On entry, the main diagonal of the tridiagonal matrix.
> On exit, its eigenvalues.

E : DOUBLE PRECISION array, dimension (N-1) [in]
> The off-diagonal elements of the tridiagonal matrix.
> On exit, E has been destroyed.

Q : DOUBLE PRECISION array, dimension (LDQ, N) [in,out]
> On entry, Q must contain an N-by-N orthogonal matrix.
> If ICOMPQ = 0    Q is not referenced.
> If ICOMPQ = 1    On entry, Q is a subset of the columns of the
> orthogonal matrix used to reduce the full
> matrix to tridiagonal form corresponding to
> the subset of the full matrix which is being
> decomposed at this time.
> If ICOMPQ = 2    On entry, Q will be the identity matrix.
> On exit, Q contains the eigenvectors of the
> tridiagonal matrix.

LDQ : INTEGER [in]
> The leading dimension of the array Q.  If eigenvectors are
> desired, then  LDQ >= max(1,N).  In any case,  LDQ >= 1.

QSTORE : DOUBLE PRECISION array, dimension (LDQS, N) [out]
> Referenced only when ICOMPQ = 1.  Used to store parts of
> the eigenvector matrix when the updating matrix multiplies
> take place.

LDQS : INTEGER [in]
> The leading dimension of the array QSTORE.  If ICOMPQ = 1,
> then  LDQS >= max(1,N).  In any case,  LDQS >= 1.

WORK : DOUBLE PRECISION array, [out]
> If ICOMPQ = 0 or 1, the dimension of WORK must be at least
> 1 + 3\*N + 2\*N\*lg N + 3\*N\*\*2
> ( lg( N ) = smallest integer k
> such that 2^k >= N )
> If ICOMPQ = 2, the dimension of WORK must be at least
> 4\*N + N\*\*2.

IWORK : INTEGER array, [out]
> If ICOMPQ = 0 or 1, the dimension of IWORK must be at least
> 6 + 6\*N + 5\*N\*lg N.
> ( lg( N ) = smallest integer k
> such that 2^k >= N )
> If ICOMPQ = 2, the dimension of IWORK must be at least
> 3 + 5\*N.

INFO : INTEGER [out]
> = 0:  successful exit.
> < 0:  if INFO = -i, the i-th argument had an illegal value.
> > 0:  The algorithm failed to compute an eigenvalue while
> working on the submatrix lying in rows and columns
> INFO/(N+1) through mod(INFO,N+1).
