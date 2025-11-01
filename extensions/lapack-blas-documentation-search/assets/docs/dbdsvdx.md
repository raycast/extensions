```fortran
subroutine dbdsvdx (
        character uplo,
        character jobz,
        character range,
        integer n,
        double precision, dimension( * ) d,
        double precision, dimension( * ) e,
        double precision vl,
        double precision vu,
        integer il,
        integer iu,
        integer ns,
        double precision, dimension( * ) s,
        double precision, dimension( ldz, * ) z,
        integer ldz,
        double precision, dimension( * ) work,
        integer, dimension( * ) iwork,
        integer info
)
```

DBDSVDX computes the singular value decomposition (SVD) of a real
N-by-N (upper or lower) bidiagonal matrix B, B = U \* S \* VT,
where S is a diagonal matrix with non-negative diagonal elements
(the singular values of B), and U and VT are orthogonal matrices
of left and right singular vectors, respectively.

Given an upper bidiagonal B with diagonal D = [ d_1 d_2 ... d_N ]
and superdiagonal E = [ e_1 e_2 ... e_N-1 ], DBDSVDX computes the
singular value decomposition of B through the eigenvalues and
eigenvectors of the N\*2-by-N\*2 tridiagonal matrix

|  0  d_1                |
| d_1  0  e_1            |
TGK = |     e_1  0  d_2        |
|         d_2  .   .     |
|              .   .   . |

If (s,u,v) is a singular triplet of B with ||u|| = ||v|| = 1, then
(+/-s,q), ||q|| = 1, are eigenpairs of TGK, with q = P \* ( u' +/-v' ) /
sqrt(2) = ( v_1 u_1 v_2 u_2 ... v_n u_n ) / sqrt(2), and
P = [ e_{n+1} e_{1} e_{n+2} e_{2} ... ].

Given a TGK matrix, one can either a) compute -s,-v and change signs
so that the singular values (and corresponding vectors) are already in
descending order (as in DGESVD/DGESDD) or b) compute s,v and reorder
the values (and corresponding vectors). DBDSVDX implements a) by
calling DSTEVX (bisection plus inverse iteration, to be replaced
with a version of the Multiple Relative Robust Representation
algorithm. (See P. Willems and B. Lang, A framework for the MR^3
algorithm: theory and implementation, SIAM J. Sci. Comput.,
35:740-766, 2013.)

## Parameters
UPLO : CHARACTER\*1 [in]
> = 'U':  B is upper bidiagonal;
> = 'L':  B is lower bidiagonal.

JOBZ : CHARACTER\*1 [in]
> = 'N':  Compute singular values only;
> = 'V':  Compute singular values and singular vectors.

RANGE : CHARACTER\*1 [in]
> = 'A': all singular values will be found.
> = 'V': all singular values in the half-open interval [VL,VU)
> will be found.
> = 'I': the IL-th through IU-th singular values will be found.

N : INTEGER [in]
> The order of the bidiagonal matrix.  N >= 0.

D : DOUBLE PRECISION array, dimension (N) [in]
> The n diagonal elements of the bidiagonal matrix B.

E : DOUBLE PRECISION array, dimension (max(1,N-1)) [in]
> The (n-1) superdiagonal elements of the bidiagonal matrix
> B in elements 1 to N-1.

VL : DOUBLE PRECISION [in]
> If RANGE='V', the lower bound of the interval to
> be searched for singular values. VU > VL.
> Not referenced if RANGE = 'A' or 'I'.

VU : DOUBLE PRECISION [in]
> If RANGE='V', the upper bound of the interval to
> be searched for singular values. VU > VL.
> Not referenced if RANGE = 'A' or 'I'.

IL : INTEGER [in]
> If RANGE='I', the index of the
> smallest singular value to be returned.
> 1 <= IL <= IU <= min(M,N), if min(M,N) > 0.
> Not referenced if RANGE = 'A' or 'V'.

IU : INTEGER [in]
> If RANGE='I', the index of the
> largest singular value to be returned.
> 1 <= IL <= IU <= min(M,N), if min(M,N) > 0.
> Not referenced if RANGE = 'A' or 'V'.

NS : INTEGER [out]
> The total number of singular values found.  0 <= NS <= N.
> If RANGE = 'A', NS = N, and if RANGE = 'I', NS = IU-IL+1.

S : DOUBLE PRECISION array, dimension (N) [out]
> The first NS elements contain the selected singular values in
> ascending order.

Z : DOUBLE PRECISION array, dimension (2\*N,K) [out]
> If JOBZ = 'V', then if INFO = 0 the first NS columns of Z
> contain the singular vectors of the matrix B corresponding to
> the selected singular values, with U in rows 1 to N and V
> in rows N+1 to N\*2, i.e.
> Z = [ U ]
> [ V ]
> If JOBZ = 'N', then Z is not referenced.
> Note: The user must ensure that at least K = NS+1 columns are
> supplied in the array Z; if RANGE = 'V', the exact value of
> NS is not known in advance and an upper bound must be used.

LDZ : INTEGER [in]
> The leading dimension of the array Z. LDZ >= 1, and if
> JOBZ = 'V', LDZ >= max(2,N\*2).

WORK : DOUBLE PRECISION array, dimension (14\*N) [out]

IWORK : INTEGER array, dimension (12\*N) [out]
> If JOBZ = 'V', then if INFO = 0, the first NS elements of
> IWORK are zero. If INFO > 0, then IWORK contains the indices
> of the eigenvectors that failed to converge in DSTEVX.

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value
> > 0:  if INFO = i, then i eigenvectors failed to converge
> in DSTEVX. The indices of the eigenvectors
> (as returned by DSTEVX) are stored in the
> array IWORK.
> if INFO = N\*2 + 1, an internal error occurred.
