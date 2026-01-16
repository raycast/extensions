```fortran
subroutine cgesdd (
        character jobz,
        integer m,
        integer n,
        complex, dimension( lda, * ) a,
        integer lda,
        real, dimension( * ) s,
        complex, dimension( ldu, * ) u,
        integer ldu,
        complex, dimension( ldvt, * ) vt,
        integer ldvt,
        complex, dimension( * ) work,
        integer lwork,
        real, dimension( * ) rwork,
        integer, dimension( * ) iwork,
        integer info
)
```

CGESDD computes the singular value decomposition (SVD) of a complex
M-by-N matrix A, optionally computing the left and/or right singular
vectors, by using divide-and-conquer method. The SVD is written

A = U \* SIGMA \* conjugate-transpose(V)

where SIGMA is an M-by-N matrix which is zero except for its
min(m,n) diagonal elements, U is an M-by-M unitary matrix, and
V is an N-by-N unitary matrix.  The diagonal elements of SIGMA
are the singular values of A; they are real and non-negative, and
are returned in descending order.  The first min(m,n) columns of
U and V are the left and right singular vectors of A.

Note that the routine returns VT = V\*\*H, not V.

## Parameters
JOBZ : CHARACTER\*1 [in]
> Specifies options for computing all or part of the matrix U:
> = 'A':  all M columns of U and all N rows of V\*\*H are
> returned in the arrays U and VT;
> = 'S':  the first min(M,N) columns of U and the first
> min(M,N) rows of V\*\*H are returned in the arrays U
> and VT;
> = 'O':  If M >= N, the first N columns of U are overwritten
> in the array A and all rows of V\*\*H are returned in
> the array VT;
> otherwise, all columns of U are returned in the
> array U and the first M rows of V\*\*H are overwritten
> in the array A;
> = 'N':  no columns of U or rows of V\*\*H are computed.

M : INTEGER [in]
> The number of rows of the input matrix A.  M >= 0.

N : INTEGER [in]
> The number of columns of the input matrix A.  N >= 0.

A : COMPLEX array, dimension (LDA,N) [in,out]
> On entry, the M-by-N matrix A.
> On exit,
> if JOBZ = 'O',  A is overwritten with the first N columns
> of U (the left singular vectors, stored
> columnwise) if M >= N;
> A is overwritten with the first M rows
> of V\*\*H (the right singular vectors, stored
> rowwise) otherwise.
> if JOBZ .ne. 'O', the contents of A are destroyed.

LDA : INTEGER [in]
> The leading dimension of the array A.  LDA >= max(1,M).

S : REAL array, dimension (min(M,N)) [out]
> The singular values of A, sorted so that S(i) >= S(i+1).

U : COMPLEX array, dimension (LDU,UCOL) [out]
> UCOL = M if JOBZ = 'A' or JOBZ = 'O' and M < N;
> UCOL = min(M,N) if JOBZ = 'S'.
> If JOBZ = 'A' or JOBZ = 'O' and M < N, U contains the M-by-M
> unitary matrix U;
> if JOBZ = 'S', U contains the first min(M,N) columns of U
> (the left singular vectors, stored columnwise);
> if JOBZ = 'O' and M >= N, or JOBZ = 'N', U is not referenced.

LDU : INTEGER [in]
> The leading dimension of the array U.  LDU >= 1;
> if JOBZ = 'S' or 'A' or JOBZ = 'O' and M < N, LDU >= M.

VT : COMPLEX array, dimension (LDVT,N) [out]
> If JOBZ = 'A' or JOBZ = 'O' and M >= N, VT contains the
> N-by-N unitary matrix V\*\*H;
> if JOBZ = 'S', VT contains the first min(M,N) rows of
> V\*\*H (the right singular vectors, stored rowwise);
> if JOBZ = 'O' and M < N, or JOBZ = 'N', VT is not referenced.

LDVT : INTEGER [in]
> The leading dimension of the array VT.  LDVT >= 1;
> if JOBZ = 'A' or JOBZ = 'O' and M >= N, LDVT >= N;
> if JOBZ = 'S', LDVT >= min(M,N).

WORK : COMPLEX array, dimension (MAX(1,LWORK)) [out]
> On exit, if INFO = 0, WORK(1) returns the optimal LWORK.

LWORK : INTEGER [in]
> The dimension of the array WORK. LWORK >= 1.
> If LWORK = -1, a workspace query is assumed.  The optimal
> size for the WORK array is calculated and stored in WORK(1),
> and no other work except argument checking is performed.
> 
> Let mx = max(M,N) and mn = min(M,N).
> If JOBZ = 'N', LWORK >= 2\*mn + mx.
> If JOBZ = 'O', LWORK >= 2\*mn\*mn + 2\*mn + mx.
> If JOBZ = 'S', LWORK >=   mn\*mn + 3\*mn.
> If JOBZ = 'A', LWORK >=   mn\*mn + 2\*mn + mx.
> These are not tight minimums in all cases; see comments inside code.
> For good performance, LWORK should generally be larger;
> a query is recommended.

RWORK : REAL array, dimension (MAX(1,LRWORK)) [out]
> Let mx = max(M,N) and mn = min(M,N).
> If JOBZ = 'N',    LRWORK >= 5\*mn (LAPACK <= 3.6 needs 7\*mn);
> else if mx >> mn, LRWORK >= 5\*mn\*mn + 5\*mn;
> else              LRWORK >= max( 5\*mn\*mn + 5\*mn,
> 2\*mx\*mn + 2\*mn\*mn + mn ).

IWORK : INTEGER array, dimension (8\*min(M,N)) [out]

INFO : INTEGER [out]
> <  0:  if INFO = -i, the i-th argument had an illegal value.
> = -4:  if A had a NAN entry.
> >  0:  The updating process of SBDSDC did not converge.
> =  0:  successful exit.
